"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import {
  Send,
  Code2,
  Eye,
  Sparkles,
  Plus,
  FileCode2,
  FileText,
  Trash2,
  Copy,
  Check,
  Download,
  ChevronDown,
  Bot,
  User,
} from "lucide-react";

interface FileEntry {
  name: string;
  content: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export default function CodePage() {
  const router = useRouter();
  const { user } = useAuth();
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLIFrameElement>(null);
  const codeRef = useRef<HTMLTextAreaElement>(null);
  const [chatOpen, setChatOpen] = useState(true);

  const tier = user?.subscription_tier || "free";
  const hasAccess = tier === "pro" || tier === "max";

  const codeModels = [
    { name: "Logos 2.5", minTier: "free" },
    { name: "Ethos 4.1", minTier: "pro" },
    { name: "Aether 1.5", minTier: "max" },
  ];
  const TIER_ORDER = ["free", "pro", "max"];
  const canUseModel = (t: string, min: string) => TIER_ORDER.indexOf(t) >= TIER_ORDER.indexOf(min);
  const defaultModel = tier === "max" ? "Aether 1.5" : tier === "pro" ? "Ethos 4.1" : "Logos 2.5";
  const [modelName, setModelName] = useState(defaultModel);
  const [showModelDropdown, setShowModelDropdown] = useState(false);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [activeFile, setActiveFile] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  useEffect(() => {
    if (!showPreview || !previewRef.current || files.length === 0) return;

    const htmlFile = files.find((f) => f.name.endsWith("html"));
    const cssFiles = files.filter((f) => f.name.endsWith("css"));
    const jsFiles = files.filter((f) => f.name.endsWith("js"));

    let html = htmlFile?.content || `<html><body><h1>Превью</h1></body></html>`;

    if (html.includes("<head>")) {
      const styleTags = cssFiles.map((f) => `<style>${f.content}</style>`).join("\n");
      const scriptTags = jsFiles.map((f) => `<script>${f.content}<\/script>`).join("\n");
      if (!html.includes("<style>")) html = html.replace("</head>", `${styleTags}\n</head>`);
      if (!html.includes("<script")) html = html.replace("</body>", `${scriptTags}\n</body>`);
    } else {
      html = `<html><head>${cssFiles.map((f) => `<style>${f.content}</style>`).join("\n")}</head><body>${html}${jsFiles.map((f) => `<script>${f.content}<\/script>`).join("\n")}</body></html>`;
    }

    const blob = new Blob([html], { type: "text/html" });
    previewRef.current.src = URL.createObjectURL(blob);
  }, [files, showPreview]);

  const handleSend = async () => {
    if (!chatInput.trim() || chatLoading) return;

    const userMsg = chatInput.trim();
    setChatMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setChatInput("");
    setChatLoading(true);

    try {
      const res = await fetch("/api/code/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            ...chatMessages.map((m) => ({ role: m.role, content: m.content })),
            { role: "user", content: userMsg },
          ],
          files,
        }),
      });

      if (!res.ok) {
        setChatMessages((prev) => [...prev, { role: "assistant", content: "Ошибка AI-сервиса. Попробуйте снова." }]);
        setChatLoading(false);
        return;
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";

      setChatMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          for (const line of chunk.split("\n")) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6).trim();
              if (data === "[DONE]") continue;
              try {
                const parsed = JSON.parse(data);
                if (parsed.content) {
                  fullContent += parsed.content;
                  setChatMessages((prev) => {
                    const updated = [...prev];
                    updated[updated.length - 1] = { role: "assistant", content: fullContent };
                    return updated;
                  });
                }
              } catch {}
            }
          }
        }

        const cleaned = fullContent
          .replace(/```html\n?/g, "")
          .replace(/```css\n?/g, "")
          .replace(/```javascript\n?/g, "")
          .replace(/```js\n?/g, "")
          .replace(/```\n?/g, "");

        const fileRegex = /---\s*(.+?)\s*---\n([\s\S]*?)(?=---\s*\S+\s*---|$)/g;
        let match;
        const newFiles: FileEntry[] = [];

        while ((match = fileRegex.exec(cleaned)) !== null) {
          const fileName = match[1].trim();
          const fileContent = match[2].trim();
          if (fileName && fileContent) {
            newFiles.push({ name: fileName, content: fileContent });
          }
        }

        if (newFiles.length > 0) {
          setFiles((prev) => {
            const updated = [...prev];
            for (const nf of newFiles) {
              const existing = updated.findIndex((f) => f.name === nf.name);
              if (existing >= 0) {
                updated[existing] = nf;
              } else {
                updated.push(nf);
              }
            }
            return updated;
          });
          setShowPreview(true);
        }
      }
    } catch {
      setChatMessages((prev) => {
        const updated = [...prev];
        if (updated.length > 0 && updated[updated.length - 1].role === "assistant" && updated[updated.length - 1].content === "") {
          updated.pop();
        }
        updated.push({ role: "assistant", content: "Произошла ошибка. Попробуйте снова." });
        return updated;
      });
    }

    setChatLoading(false);
  };

  const copyCode = () => {
    if (files[activeFile]) {
      navigator.clipboard.writeText(files[activeFile].content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const downloadFile = () => {
    if (!files[activeFile]) return;
    const blob = new Blob([files[activeFile].content], { type: "text/plain" });
    const link = document.createElement("a");
    link.download = files[activeFile].name;
    link.href = URL.createObjectURL(blob);
    link.click();
  };

  const addNewFile = () => {
    const name = prompt("Имя файла (например: app.js):");
    if (!name || files.some((f) => f.name === name)) return;
    setFiles((prev) => [...prev, { name, content: "" }]);
    setActiveFile(files.length);
  };

  const deleteFile = (index: number) => {
    if (files.length <= 1) return;
    const updated = files.filter((_, i) => i !== index);
    setFiles(updated);
    if (activeFile >= updated.length) setActiveFile(updated.length - 1);
  };

  if (!hasAccess) {
    return (
      <div className="flex flex-col h-full bg-[var(--bg-main)]">
        <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
          <div className="w-20 h-20 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] flex items-center justify-center mb-6">
            <Code2 size={40} className="text-[var(--accent)]" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)] mb-3">Pixel Code</h1>
          <p className="text-sm text-[var(--text-secondary)] max-w-md mb-6">
            IDE в браузере с AI-помощником, редактором кода и live-превью.
            Доступно для тарифов Pro и Max.
          </p>
          <Link href="/pricing" className="px-5 py-2.5 rounded-xl bg-[var(--accent)] text-[var(--text-on-primary)] text-sm font-medium hover:bg-[var(--accent-hover)] transition-colors">
            Обновить тариф
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-[var(--bg-main)]">
      {/* Toggle Chat Button */}
      <button
        onClick={() => setChatOpen(!chatOpen)}
        className="absolute top-12 left-2 z-10 w-7 h-7 flex items-center justify-center rounded-lg bg-[var(--bg-surface)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--border)] transition-colors cursor-pointer"
        title={chatOpen ? "Скрыть чат" : "Показать чат"}
      >
        <Sparkles size={14} />
      </button>

      {/* Chat Panel */}
      {chatOpen && (
      <div className="w-96 flex flex-col border-r border-[var(--bg-surface)]">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--bg-surface)]">
          <Sparkles size={16} className="text-[var(--accent)]" />
          <span className="text-sm font-medium text-[var(--text-primary)]">Pixel Code</span>
          <span className="ml-auto text-[10px] text-[var(--text-muted)] bg-[var(--bg-elevated)] px-2 py-0.5 rounded-full">
            {tier === "max" ? "Aether" : tier === "pro" ? "Ethos" : "Logos"}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {chatMessages.length === 0 && mounted && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-12 h-12 rounded-full bg-[var(--accent)]/10 flex items-center justify-center mb-4">
                <Sparkles size={24} className="text-[var(--accent)]" />
              </div>
              <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Пора кодить!</h2>
              <p className="text-xs text-[var(--text-secondary)] max-w-xs">
                Опишите что хотите создать — сайт, приложение, игру. AI сгенерирует код, а вы сможете его редактировать и сразу видеть результат.
              </p>
            </div>
          )}

          {chatMessages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              {msg.role === "assistant" && (
                <div className="w-7 h-7 rounded-full bg-[var(--accent)]/10 flex items-center justify-center flex-shrink-0 mt-1">
                  <Bot size={14} className="text-[var(--accent)]" />
                </div>
              )}
              <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                msg.role === "user"
                  ? "bg-[var(--accent)] text-[var(--text-on-primary)] rounded-tr-sm"
                  : "bg-[var(--bg-surface)] text-[var(--text-primary)] rounded-tl-sm border border-[var(--border)]"
              }`}>
                {msg.content.split("```").map((block, j) => {
                  if (j % 2 === 1) {
                    return (
                      <pre key={j} className="my-1 p-2 rounded-lg bg-[var(--bg-elevated)] text-xs overflow-x-auto font-mono">
                        <code>{block.replace(/^(html|css|js|javascript)\n/, "")}</code>
                      </pre>
                    );
                  }
                  return <span key={j} className="whitespace-pre-wrap">{block}</span>;
                })}
                {chatLoading && i === chatMessages.length - 1 && msg.role === "assistant" && !msg.content && (
                  <div className="flex gap-1 py-1">
                    <div className="w-1.5 h-1.5 bg-[var(--text-muted)] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-1.5 h-1.5 bg-[var(--text-muted)] rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-1.5 h-1.5 bg-[var(--text-muted)] rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                )}
              </div>
              {msg.role === "user" && (
                <div className="w-7 h-7 rounded-full bg-[var(--accent)] flex items-center justify-center flex-shrink-0 mt-1">
                  <User size={14} className="text-[var(--text-on-primary)]" />
                </div>
              )}
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        <div className="p-3 border-t border-[var(--bg-surface)]">
          <div className="flex items-end gap-2">
            <textarea
              ref={chatInputRef}
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Опишите что создать..."
              rows={2}
              disabled={chatLoading}
              className="flex-1 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:border-[var(--accent)] transition-colors resize-none"
            />
            <button
              onClick={handleSend}
              disabled={chatLoading || !chatInput.trim()}
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-[var(--accent)] text-[var(--text-on-primary)] hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50 cursor-pointer flex-shrink-0"
            >
              {chatLoading ? (
                <div className="w-4 h-4 border-2 border-[var(--text-on-primary)] border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send size={16} />
              )}
            </button>
          </div>
        </div>
      </div>
      )}

      {/* Editor + Preview Panel */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Tab Bar */}
        <div className="flex items-center border-b border-[var(--bg-surface)]">
          <div className="flex items-center overflow-x-auto">
            {files.map((file, index) => {
              const Icon = file.name.endsWith("html") ? FileCode2 : FileText;
              return (
                <div
                  key={file.name}
                  className={`group flex items-center gap-1.5 px-3 py-2 text-xs cursor-pointer border-r border-[var(--bg-surface)] transition-colors ${
                    index === activeFile
                      ? "bg-[var(--bg-main)] text-[var(--text-primary)]"
                      : "text-[var(--text-muted)] hover:bg-[var(--bg-surface)]"
                  }`}
                  onClick={() => setActiveFile(index)}
                >
                  <Icon size={12} />
                  <span>{file.name}</span>
                  {files.length > 1 && (
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteFile(index); }}
                      className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-red-500/10 text-[var(--text-muted)] hover:text-red-500 transition-all cursor-pointer"
                    >
                      <Trash2 size={10} />
                    </button>
                  )}
                </div>
              );
            })}
            <button
              onClick={addNewFile}
              className="flex items-center gap-1 px-2 py-2 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors cursor-pointer"
            >
              <Plus size={12} />
            </button>
          </div>

          <div className="flex items-center gap-1 ml-auto px-2">
            <button
              onClick={copyCode}
              className="flex items-center gap-1 px-2 py-1 rounded text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--border)] transition-colors cursor-pointer"
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? "Скопировано" : "Копировать"}
            </button>
            <button
              onClick={downloadFile}
              className="flex items-center gap-1 px-2 py-1 rounded text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--border)] transition-colors cursor-pointer"
            >
              <Download size={12} />
            </button>
            <button
              onClick={() => setShowPreview(!showPreview)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                showPreview
                  ? "bg-[var(--accent)]/15 text-[var(--accent)]"
                  : "text-[var(--text-secondary)] hover:bg-[var(--border)]"
              }`}
            >
              {showPreview ? <Eye size={14} /> : <Eye size={14} />}
              {showPreview ? "Скрыть превью" : "Показать превью"}
            </button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Code Editor */}
          <div className={`${showPreview ? "w-1/2" : "w-full"} flex flex-col border-r border-[var(--bg-surface)]`}>
            {files.length > 0 ? (
              <textarea
                ref={codeRef}
                value={files[activeFile]?.content || ""}
                onChange={(e) => {
                  const updated = [...files];
                  updated[activeFile] = { ...updated[activeFile], content: e.target.value };
                  setFiles(updated);
                }}
                className="flex-1 w-full p-4 bg-[#1e1e2e] text-[#cdd6f4] font-mono text-sm leading-relaxed resize-none outline-none"
                spellCheck={false}
                onKeyDown={(e) => {
                  if (e.key === "Tab") {
                    e.preventDefault();
                    const ta = e.currentTarget;
                    const start = ta.selectionStart;
                    const end = ta.selectionEnd;
                    const val = ta.value;
                    const updated = [...files];
                    updated[activeFile] = { ...updated[activeFile], content: val.substring(0, start) + "  " + val.substring(end) };
                    setFiles(updated);
                    requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = start + 2; });
                  }
                }}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center text-[var(--text-muted)] text-sm">
                <div className="text-center">
                  <Code2 size={32} className="mx-auto mb-2 opacity-30" />
                  <p>Создайте файл или попросите AI сгенерировать код</p>
                </div>
              </div>
            )}
          </div>

          {/* Preview */}
          {showPreview && (
            <div className="w-1/2 flex flex-col">
              <div className="flex items-center px-3 py-1.5 border-b border-[var(--bg-surface)] bg-[var(--bg-surface)]/30">
                <Eye size={12} className="text-[var(--text-muted)] mr-2" />
                <span className="text-xs text-[var(--text-muted)]">Предпросмотр</span>
                <button
                  onClick={() => previewRef.current && (previewRef.current.src = previewRef.current.src)}
                  className="ml-auto text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                >
                  Обновить
                </button>
              </div>
              <iframe ref={previewRef} className="flex-1 bg-white border-0" sandbox="allow-scripts" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
