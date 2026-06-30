"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Send, Download, Sparkles, Code, Eye, Copy, Check, Loader2,
  Trash2, ArrowLeft, Plus, Search, PanelLeftClose, PanelLeft,
  RotateCcw, Undo2, Redo2, Maximize2, Minimize2,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface DesignProject {
  id: string;
  title: string;
  updated_at: string;
  html?: string;
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
  const [designs, setDesigns] = useState<DesignProject[]>([]);
  const [previewReady, setPreviewReady] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [codeHistory, setCodeHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [fullscreen, setFullscreen] = useState(false);
  const searchParams = new URLSearchParams(
    typeof window !== "undefined" ? window.location.search : ""
  );
  const previewRef = useRef<HTMLIFrameElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const codeRef = useRef<HTMLTextAreaElement>(null);

  const tier = user?.subscription_tier || "free";
  const hasAccess = tier === "pro" || tier === "max";

  const applyHtmlToPreview = useCallback(() => {
    if (!previewRef.current || !html) return;
    const blob = new Blob([html], { type: "text/html" });
    previewRef.current.src = URL.createObjectURL(blob);
  }, [html]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (previewReady) applyHtmlToPreview();
  }, [html, previewReady, applyHtmlToPreview]);

  useEffect(() => {
    fetch("/api/conversations")
      .then((r) => r.json())
      .then((data) => setDesigns(data.filter((c: any) => c.model === "design")))
      .catch(() => {});

    const id = new URLSearchParams(window.location.search).get("id");
    if (id) loadDesign(id);
  }, []);

  const loadDesign = async (id: string) => {
    const res = await fetch(`/api/conversations/${id}`);
    if (!res.ok) return;
    const msgs = await res.json();
    setMessages(msgs.map((m: any) => ({ role: m.role, content: m.content })));
    setConvId(id);
    const assistantMsgs = msgs.filter((m: any) => m.role === "assistant");
    if (assistantMsgs.length > 0) {
      const last = assistantMsgs[assistantMsgs.length - 1].content;
      const cleaned = extractHtml(last);
      if (cleaned) {
        setHtml(cleaned);
        setCodeHistory([cleaned]);
        setHistoryIndex(0);
      }
    }
  };

  const extractHtml = (text: string): string => {
    const cleaned = text.replace(/```html\n?/g, "").replace(/```\n?/g, "").trim();
    if (cleaned.includes("<!DOCTYPE") || cleaned.includes("<html")) return cleaned;
    return "";
  };

  const pushHistory = (newHtml: string) => {
    const newHistory = codeHistory.slice(0, historyIndex + 1);
    newHistory.push(newHtml);
    setCodeHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setHtml(codeHistory[historyIndex - 1]);
    }
  };

  const redo = () => {
    if (historyIndex < codeHistory.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setHtml(codeHistory[historyIndex + 1]);
    }
  };

  const deleteDesign = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await fetch(`/api/conversations/${id}`, { method: "DELETE" });
    setDesigns((prev) => prev.filter((d) => d.id !== id));
    if (convId === id) {
      setMessages([]);
      setHtml("");
      setConvId(null);
      setCodeHistory([]);
      setHistoryIndex(-1);
    }
  };

  const newDesign = () => {
    setMessages([]);
    setHtml("");
    setConvId(null);
    setCodeHistory([]);
    setHistoryIndex(-1);
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

    const isEdit = html && (userMsg.toLowerCase().includes("измени") ||
      userMsg.toLowerCase().includes("редактируй") ||
      userMsg.toLowerCase().includes("добавь") ||
      userMsg.toLowerCase().includes("убери") ||
      userMsg.toLowerCase().includes("поменяй") ||
      userMsg.toLowerCase().includes("сделай") ||
      userMsg.toLowerCase().includes("измени цвет") ||
      userMsg.toLowerCase().includes("поменяй фон") ||
      userMsg.toLowerCase().includes("добавь секцию") ||
      userMsg.toLowerCase().includes("убери секцию") ||
      userMsg.toLowerCase().includes("переделай") ||
      userMsg.toLowerCase().includes("обнови") ||
      userMsg.toLowerCase().includes("улучши") ||
      userMsg.toLowerCase().includes("fix") ||
      userMsg.toLowerCase().includes("change") ||
      userMsg.toLowerCase().includes("add") ||
      userMsg.toLowerCase().includes("remove") ||
      userMsg.toLowerCase().includes("update") ||
      userMsg.toLowerCase().includes("make") ||
      userMsg.toLowerCase().includes("edit"));

    const systemPrompt = isEdit
      ? `You are Pixel Design AI — an expert web developer. The user wants to EDIT an existing website.

You already generated this HTML. Now the user wants changes. Return the COMPLETE updated HTML document with their requested changes applied.

CURRENT HTML:
${html}

RULES:
1. Return ONLY the full updated HTML document — no markdown, no code blocks, no explanations
2. Preserve all existing good code — only change what the user asked
3. Keep the same design system (colors, fonts, spacing)
4. Make the requested changes precisely
5. The HTML must be complete and self-contained
6. Reply in the same language as the user`
      : `You are Pixel Design AI — the world's best web designer and developer. You create stunning, production-ready websites from natural language descriptions.

Your output is a SINGLE complete HTML file. No explanations, no markdown, no code fences — just raw HTML.

DESIGN PRINCIPLES:
- Apple-level design quality: clean, minimal, premium feel
- Beautiful typography with Google Fonts (Inter, SF Pro, or similar)
- Smooth gradients, subtle shadows, glass morphism where appropriate
- Micro-interactions: hover effects, smooth transitions, subtle animations
- Responsive: works perfectly on mobile, tablet, desktop
- Color palette: modern, harmonious, with good contrast
- White space is your friend — don't clutter
- Use CSS custom properties for theming
- Semantic HTML5 structure
- Smooth scroll behavior
- Images: use placeholder services like picsum.photos or unsplash for demo images
- Icons: use SVG inline or Lucide-style icons via CSS

TECHNICAL:
- Single self-contained HTML file (all CSS in <style>, minimal JS if needed)
- CSS Grid + Flexbox for layout
- CSS variables for colors
- @import for Google Fonts
- Mobile-first responsive design
- Smooth transitions (0.3s ease)
- Box shadows for depth
- Border radius: 12-16px for cards, 8px for buttons

Reply in the same language as the user.`;

    const contextMessages = isEdit
      ? [{ role: "user" as const, content: userMsg }]
      : messages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

    const allMessages = [
      { role: "system" as const, content: systemPrompt },
      ...contextMessages,
      { role: "user" as const, content: userMsg },
    ];

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: allMessages.map((m) => ({ role: m.role, content: m.content })),
          conversationId: conversationId || crypto.randomUUID(),
          modelOverride: "design",
        }),
      });

      if (!res.ok) {
        setMessages((prev) => [...prev, { role: "assistant", content: "Ошибка генерации." }]);
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

        const newHtml = extractHtml(fullContent);
        if (newHtml) {
          setHtml(newHtml);
          pushHistory(newHtml);
        }
      }
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Ошибка генерации." }]);
    }

    setLoading(false);
  };

  const handleCodeEdit = (newCode: string) => {
    setHtml(newCode);
    pushHistory(newCode);
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

  const filteredDesigns = searchQuery
    ? designs.filter((d) => d.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : designs;

  if (!hasAccess) {
    return (
      <div className="flex h-full">
        <div className="w-64 flex flex-col bg-[#0d1117] border-r border-gray-800">
          <div className="p-3">
            <Link href="/chat" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-gray-800 transition-colors">
              <ArrowLeft size={16} />
              Назад к чату
            </Link>
          </div>
          <div className="flex-1 flex items-center justify-center p-4">
            <p className="text-gray-500 text-xs text-center">Обновите тариф для доступа к Design</p>
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center bg-[#0d1117]">
          <Sparkles size={48} className="text-[#7c3aed] mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Pixel Design</h1>
          <p className="text-gray-400 text-sm mb-6">Создавайте сайты по описанию. Pro или Max тариф.</p>
          <Link href="/pricing" className="px-5 py-2.5 rounded-xl bg-[#7c3aed] text-white text-sm font-medium hover:bg-[#6d28d9] transition-colors">
            Обновить тариф
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-[#0d1117]">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? "w-64" : "w-0"} flex flex-col bg-[#0d1117] border-r border-gray-800 transition-all duration-300 overflow-hidden flex-shrink-0`}>
        <div className="p-3 space-y-2">
          <Link
            href="/chat"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-gray-800 transition-colors"
          >
            <ArrowLeft size={16} />
            Назад к чату
          </Link>
          <button
            onClick={newDesign}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-gray-800 transition-colors cursor-pointer"
          >
            <Plus size={16} />
            Новый дизайн
          </button>
        </div>

        <div className="px-3 pb-2">
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-gray-800/50 border border-gray-700">
            <Search size={14} className="text-gray-500" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск..."
              className="flex-1 bg-transparent text-sm text-gray-300 placeholder-gray-500 outline-none"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-2">
          <p className="px-2 py-1 text-[10px] font-medium text-gray-500 uppercase tracking-wider">Проекты</p>
          {filteredDesigns.length === 0 ? (
            <p className="px-2 py-4 text-xs text-gray-600">Нет проектов</p>
          ) : (
            filteredDesigns.map((d) => (
              <div key={d.id} className="group flex items-center">
                <button
                  onClick={() => loadDesign(d.id)}
                  className={`flex-1 text-left px-3 py-2 rounded-lg text-[13px] transition-colors cursor-pointer ${
                    convId === d.id
                      ? "bg-[#7c3aed]/15 text-[#a78bfa]"
                      : "text-gray-400 hover:bg-gray-800 hover:text-gray-200"
                  }`}
                >
                  <span className="truncate block">{d.title}</span>
                </button>
                <button
                  onClick={(e) => deleteDesign(d.id, e)}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition-all cursor-pointer mr-1"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800 bg-[#0d1117]">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-800 transition-colors cursor-pointer"
            >
              {sidebarOpen ? <PanelLeftClose size={16} /> : <PanelLeft size={16} />}
            </button>
            {convId && (
              <div className="flex items-center gap-1">
                <button onClick={undo} disabled={historyIndex <= 0} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-800 transition-colors cursor-pointer disabled:opacity-30">
                  <Undo2 size={14} />
                </button>
                <button onClick={redo} disabled={historyIndex >= codeHistory.length - 1} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-800 transition-colors cursor-pointer disabled:opacity-30">
                  <Redo2 size={14} />
                </button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1">
            {html && (
              <>
                <button
                  onClick={() => setView("preview")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                    view === "preview" ? "bg-[#7c3aed]/15 text-[#a78bfa]" : "text-gray-400 hover:bg-gray-800"
                  }`}
                >
                  <Eye size={14} />
                  Превью
                </button>
                <button
                  onClick={() => setView("code")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                    view === "code" ? "bg-[#7c3aed]/15 text-[#a78bfa]" : "text-gray-400 hover:bg-gray-800"
                  }`}
                >
                  <Code size={14} />
                  Код
                </button>
                <div className="w-px h-4 bg-gray-700 mx-1" />
                <button onClick={handleCopy} className="flex items-center gap-1 px-2 py-1 rounded text-xs text-gray-400 hover:text-white hover:bg-gray-800 transition-colors cursor-pointer">
                  {copied ? <Check size={12} /> : <Copy size={12} />}
                </button>
                <button onClick={handleDownload} className="flex items-center gap-1 px-2 py-1 rounded text-xs text-gray-400 hover:text-white hover:bg-gray-800 transition-colors cursor-pointer">
                  <Download size={12} />
                </button>
                <button onClick={() => setFullscreen(!fullscreen)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-800 transition-colors cursor-pointer">
                  {fullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Empty State */}
          {messages.length === 0 && !html ? (
            <div className="flex-1 flex flex-col items-center justify-center bg-[#0d1117] px-4">
              <div className="w-16 h-16 rounded-2xl bg-[#7c3aed]/10 flex items-center justify-center mb-6">
                <Sparkles size={32} className="text-[#7c3aed]" />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-2 text-center">
                Что сегодня будем дизайнить?
              </h1>
              <p className="text-gray-400 text-sm mb-8 text-center max-w-md">
                Опишите сайт, лендинг или приложение — AI создаст готовый дизайн
              </p>

              <div className="w-full max-w-2xl">
                <div className="relative">
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
                    placeholder="Спросите что угодно..."
                    rows={3}
                    disabled={loading}
                    className="w-full bg-gray-800/50 rounded-2xl border border-gray-700 px-5 py-4 text-sm text-white placeholder-gray-500 outline-none focus:border-[#7c3aed] transition-colors resize-none"
                  />
                  <div className="absolute bottom-3 right-3">
                    <button
                      onClick={handleSend}
                      disabled={loading || !prompt.trim()}
                      className="w-8 h-8 flex items-center justify-center rounded-full bg-[#7c3aed] text-white hover:bg-[#6d28d9] transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Chat Panel */}
              {!fullscreen && (
                <div className="w-96 flex flex-col border-r border-gray-800 bg-[#0d1117]">
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.map((msg, i) => (
                      <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm ${
                          msg.role === "user"
                            ? "bg-[#7c3aed] text-white rounded-tr-sm"
                            : "bg-gray-800/50 text-gray-200 rounded-tl-sm border border-gray-700"
                        }`}>
                          {msg.role === "assistant" ? (
                            extractHtml(msg.content) ? (
                              <span className="text-gray-400 italic">Дизайн обновлён — смотрите превью →</span>
                            ) : (
                              <span className="whitespace-pre-wrap">{msg.content}</span>
                            )
                          ) : (
                            <span className="whitespace-pre-wrap">{msg.content}</span>
                          )}
                          {loading && i === messages.length - 1 && msg.role === "assistant" && !msg.content && (
                            <div className="flex gap-1 py-1">
                              <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                              <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                              <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>

                  <div className="p-3 border-t border-gray-800">
                    <div className="relative">
                      <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSend();
                          }
                        }}
                        placeholder={html ? "Измените дизайн..." : "Опишите сайт..."}
                        rows={2}
                        disabled={loading}
                        className="w-full bg-gray-800/50 rounded-xl border border-gray-700 px-4 py-3 pr-12 text-sm text-white placeholder-gray-500 outline-none focus:border-[#7c3aed] transition-colors resize-none"
                      />
                      <button
                        onClick={handleSend}
                        disabled={loading || !prompt.trim()}
                        className="absolute bottom-3 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-[#7c3aed] text-white hover:bg-[#6d28d9] transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Preview / Code */}
              <div className="flex-1 flex flex-col overflow-hidden bg-[#0d1117] min-w-0">
                {view === "preview" ? (
                  html ? (
                    <iframe
                      ref={(el) => {
                        previewRef.current = el;
                        if (el) setPreviewReady(true);
                      }}
                      className="flex-1 w-full h-full border-0 bg-white"
                      sandbox="allow-scripts"
                    />
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-gray-500">
                      <p className="text-sm">Ожидание генерации...</p>
                    </div>
                  )
                ) : (
                  <div className="flex-1 relative">
                    <textarea
                      ref={codeRef}
                      value={html}
                      onChange={(e) => handleCodeEdit(e.target.value)}
                      className="absolute inset-0 w-full h-full p-4 bg-[#1e1e2e] text-[#cdd6f4] font-mono text-sm leading-relaxed resize-none outline-none"
                      spellCheck={false}
                    />
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
