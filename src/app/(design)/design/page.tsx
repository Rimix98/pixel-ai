"use client";

import { useState, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Send, Download, Sparkles, Code, Eye, Copy, Check, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function DesignPage() {
  const { user } = useAuth();
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [html, setHtml] = useState("");
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<"preview" | "code">("preview");
  const [copied, setCopied] = useState(false);
  const [convId, setConvId] = useState<string | null>(null);
  const [designs, setDesigns] = useState<Array<{ id: string; title: string; updated_at: string }>>([]);
  const searchParams = useSearchParams();
  const previewRef = useRef<HTMLIFrameElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const tier = user?.subscription_tier || "free";
  const hasAccess = tier === "pro" || tier === "max";

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!previewRef.current || !html) return;
    const blob = new Blob([html], { type: "text/html" });
    previewRef.current.src = URL.createObjectURL(blob);
  }, [html]);

  useEffect(() => {
    fetch("/api/conversations")
      .then((r) => r.json())
      .then((data) => {
        setDesigns(data.filter((c: any) => c.model === "design"));
      })
      .catch(() => {});

    const id = searchParams.get("id");
    if (id) {
      loadDesign(id);
    }
  }, [searchParams]);

  const loadDesign = async (id: string) => {
    const res = await fetch(`/api/conversations/${id}`);
    if (!res.ok) return;
    const msgs = await res.json();
    setMessages(msgs.map((m: any) => ({ role: m.role, content: m.content })));
    setConvId(id);
    const assistantMsgs = msgs.filter((m: any) => m.role === "assistant");
    if (assistantMsgs.length > 0) {
      const last = assistantMsgs[assistantMsgs.length - 1].content;
      const cleaned = last.replace(/```html\n?/g, "").replace(/```\n?/g, "").trim();
      if (cleaned.includes("<!DOCTYPE") || cleaned.includes("<html")) {
        setHtml(cleaned);
      }
    }
  };

  const newDesign = () => {
    setMessages([]);
    setHtml("");
    setConvId(null);
  };

  const handleSend = async () => {
    if (!prompt.trim() || loading) return;
    const userMsg = prompt.trim();
    setPrompt("");
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setLoading(true);

    let conversationId = convId;
    if (!conversationId) {
      try {
        const res = await fetch("/api/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: userMsg.slice(0, 50), model: "design" }),
        });
        if (res.ok) {
          const conv = await res.json();
          conversationId = conv.id;
          setConvId(conversationId);
          setDesigns((prev) => [{ id: conv.id, title: conv.title, updated_at: conv.updated_at }, ...prev]);
        }
      } catch {}
    }

    const systemPrompt = `You are Pixel Design AI. Generate complete, production-ready HTML/CSS websites based on user descriptions.

RULES:
1. Return ONLY the full HTML document — no markdown, no code blocks, no explanations
2. Use modern CSS (flexbox, grid, CSS variables, animations)
3. Make it fully responsive (mobile-first)
4. Use beautiful gradients, shadows, and modern design patterns
5. Include Google Fonts if needed
6. Make it visually stunning — think Dribbble-quality
7. Use semantic HTML
8. Add smooth transitions and micro-interactions
9. The HTML must be self-contained (all CSS inline or in <style>)
10. Reply in the same language as the user`;

    const allMessages = [
      { role: "system", content: systemPrompt },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: userMsg },
    ];

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: allMessages.map((m) => ({ role: m.role, content: m.content })),
          conversationId: conversationId || crypto.randomUUID(),
        }),
      });

      if (!res.ok) {
        setMessages((prev) => [...prev, { role: "assistant", content: "Error generating design." }]);
        setLoading(false);
        return;
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";

      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          for (const line of chunk.split("\n")) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6).trim();
              if (data === "[DONE]") break;
              try {
                const parsed = JSON.parse(data);
                if (parsed.content) {
                  fullContent += parsed.content;
                  setMessages((prev) => {
                    const updated = [...prev];
                    updated[updated.length - 1] = { role: "assistant", content: fullContent };
                    return updated;
                  });
                }
              } catch {}
            }
          }
        }

        const cleaned = fullContent.replace(/```html\n?/g, "").replace(/```\n?/g, "").trim();
        if (cleaned.includes("<!DOCTYPE") || cleaned.includes("<html")) {
          setHtml(cleaned);
        }
      }
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Error generating design." }]);
    }

    setLoading(false);
  };

  const handleDownload = () => {
    if (!html) return;
    const blob = new Blob([html], { type: "text/html" });
    const link = document.createElement("a");
    link.download = "pixel-design.html";
    link.href = URL.createObjectURL(blob);
    link.click();
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(html);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!hasAccess) {
    return (
      <div className="flex flex-col h-full bg-[var(--bg-main)]">
        <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
          <div className="w-20 h-20 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] flex items-center justify-center mb-6">
            <Sparkles size={40} className="text-[var(--accent)]" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)] mb-3">Pixel Design</h1>
          <p className="text-sm text-[var(--text-secondary)] max-w-md mb-6">
            Создавайте красивые сайты по описанию. Доступно для Pro и Max.
          </p>
          <a href="/pricing" className="px-5 py-2.5 rounded-xl bg-[var(--accent)] text-[var(--text-on-primary)] text-sm font-medium hover:bg-[var(--accent-hover)] transition-colors">
            Обновить тариф
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Sidebar with designs */}
      <div className="w-64 flex flex-col border-r border-[var(--border)] bg-[var(--bg-surface)]/30">
        <div className="p-3">
          <button
            onClick={newDesign}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-[var(--accent)] text-[var(--text-on-primary)] text-sm font-medium hover:bg-[var(--accent-hover)] transition-colors cursor-pointer"
          >
            <Sparkles size={14} />
            Новый дизайн
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-2 pb-2">
          <p className="px-2 py-1 text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wider">Мои дизайны</p>
          {designs.length === 0 ? (
            <p className="px-2 py-4 text-[12px] text-[var(--text-muted)]">Пока нет дизайнов</p>
          ) : (
            designs.map((d) => (
              <button
                key={d.id}
                onClick={() => loadDesign(d.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-[13px] transition-colors cursor-pointer mb-0.5 ${
                  convId === d.id
                    ? "bg-[var(--accent)]/10 text-[var(--accent)]"
                    : "text-[var(--text-secondary)] hover:bg-[var(--border)] hover:text-[var(--text-primary)]"
                }`}
              >
                <span className="truncate block">{d.title}</span>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat + Preview */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 flex overflow-hidden">
          {/* Chat */}
          <div className="w-96 flex flex-col border-r border-[var(--border)]">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="w-12 h-12 rounded-full bg-[var(--accent)]/10 flex items-center justify-center mb-4">
                    <Sparkles size={24} className="text-[var(--accent)]" />
                  </div>
                  <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Создайте сайт</h2>
                  <p className="text-xs text-[var(--text-secondary)] max-w-xs">
                    Опишите сайт — AI сгенерирует готовый дизайн с кодом.
                  </p>
                </div>
              )}

              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[90%] rounded-2xl px-3 py-2 text-sm ${
                    msg.role === "user"
                      ? "bg-[var(--accent)] text-[var(--text-on-primary)] rounded-tr-sm"
                      : "bg-[var(--bg-surface)] text-[var(--text-primary)] rounded-tl-sm border border-[var(--border)]"
                  }`}>
                    {msg.role === "assistant" ? (
                      msg.content.includes("<!DOCTYPE") || msg.content.includes("<html") ? (
                        <span className="text-[var(--text-muted)] italic">Дизайн сгенерирован — смотрите превью →</span>
                      ) : (
                        <span className="whitespace-pre-wrap">{msg.content}</span>
                      )
                    ) : (
                      <span className="whitespace-pre-wrap">{msg.content}</span>
                    )}
                    {loading && i === messages.length - 1 && msg.role === "assistant" && !msg.content && (
                      <div className="flex gap-1 py-1">
                        <div className="w-1.5 h-1.5 bg-[var(--text-muted)] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                        <div className="w-1.5 h-1.5 bg-[var(--text-muted)] rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                        <div className="w-1.5 h-1.5 bg-[var(--text-muted)] rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            <div className="p-3 border-t border-[var(--border)]">
              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Опишите сайт..."
                  rows={2}
                  disabled={loading}
                  className="flex-1 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:border-[var(--accent)] transition-colors resize-none"
                />
                <button
                  onClick={handleSend}
                  disabled={loading || !prompt.trim()}
                  className="w-9 h-9 flex items-center justify-center rounded-xl bg-[var(--accent)] text-[var(--text-on-primary)] hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50 cursor-pointer flex-shrink-0"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                </button>
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border)]">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setView("preview")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    view === "preview" ? "bg-[var(--accent)]/15 text-[var(--accent)]" : "text-[var(--text-secondary)] hover:bg-[var(--border)]"
                  }`}
                >
                  <Eye size={14} />
                  Превью
                </button>
                <button
                  onClick={() => setView("code")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    view === "code" ? "bg-[var(--accent)]/15 text-[var(--accent)]" : "text-[var(--text-secondary)] hover:bg-[var(--border)]"
                  }`}
                >
                  <Code size={14} />
                  Код
                </button>
              </div>
              {html && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1 px-2 py-1 rounded text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--border)] transition-colors cursor-pointer"
                  >
                    {copied ? <Check size={12} /> : <Copy size={12} />}
                    {copied ? "Скопировано" : "Копировать"}
                  </button>
                  <button
                    onClick={handleDownload}
                    className="flex items-center gap-1 px-2 py-1 rounded text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--border)] transition-colors cursor-pointer"
                  >
                    <Download size={12} />
                    Скачать
                  </button>
                </div>
              )}
            </div>

            <div className="flex-1 relative bg-white">
              {view === "preview" ? (
                html ? (
                  <iframe ref={previewRef} className="w-full h-full border-0" sandbox="allow-scripts" />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-[var(--text-muted)]">
                    <Sparkles size={48} className="mb-4 opacity-30" />
                    <p className="text-sm">Опишите сайт — превью появится здесь</p>
                  </div>
                )
              ) : (
                <pre className="h-full overflow-auto p-4 bg-[#1e1e2e] text-[#cdd6f4] font-mono text-sm leading-relaxed">
                  <code>{html || "// Код появится здесь после генерации"}</code>
                </pre>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
