"use client";

import { useState, useEffect, useRef, use } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Save,
  Play,
  Eye,
  Code,
  Trash2,
  Copy,
  Check,
  Maximize2,
  Minimize2,
} from "lucide-react";
import hljs from "highlight.js";
import "highlight.js/styles/github-dark-dimmed.css";

interface Artifact {
  id: string;
  title: string;
  content: string;
  language: string;
  type: string;
  created_at: string;
  updated_at: string;
}

const languageLabels: Record<string, string> = {
  html: "HTML",
  javascript: "JavaScript",
  typescript: "TypeScript",
  python: "Python",
  css: "CSS",
  json: "JSON",
  markdown: "Markdown",
};

export default function ArtifactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [artifact, setArtifact] = useState<Artifact | null>(null);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [language, setLanguage] = useState("html");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [copied, setCopied] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const codeRef = useRef<HTMLElement>(null);

  useEffect(() => {
    fetchArtifact();
  }, [id]);

  useEffect(() => {
    if (codeRef.current && !showPreview) {
      codeRef.current.removeAttribute("data-highlighted");
      hljs.highlightElement(codeRef.current);
    }
  }, [content, showPreview, language]);

  const fetchArtifact = async () => {
    const res = await fetch(`/api/artifacts/${id}`);
    if (res.ok) {
      const data = await res.json();
      setArtifact(data);
      setContent(data.content || "");
      setTitle(data.title);
      setLanguage(data.language);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const res = await fetch(`/api/artifacts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, title, language }),
    });
    if (res.ok) {
      const updated = await res.json();
      setArtifact(updated);
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDelete = async () => {
    await fetch(`/api/artifacts/${id}`, { method: "DELETE" });
    router.push("/artifacts");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const ta = e.currentTarget;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const newVal = content.substring(0, start) + "  " + content.substring(end);
      setContent(newVal);
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = start + 2;
      });
    }
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault();
      handleSave();
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-[var(--bg-main)]">
        <div className="w-8 h-8 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!artifact) {
    return (
      <div className="flex h-full items-center justify-center bg-[var(--bg-main)]">
        <p className="text-[var(--text-muted)]">Артефакт не найден</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[var(--bg-main)]">
      <header className="px-4 py-3 border-b border-[var(--bg-surface)]">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/artifacts")}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
          >
            <ArrowLeft size={18} />
          </button>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="flex-1 max-w-xs px-3 py-1.5 rounded-lg bg-transparent border border-transparent text-sm font-medium text-[var(--text-primary)] outline-none focus:border-[var(--accent)] transition-colors"
          />
          <span className="text-xs text-[var(--text-muted)] uppercase hidden md:block">
            {languageLabels[language] || language}
          </span>
          <div className="flex items-center gap-1 ml-auto">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              <span className="hidden md:inline">{copied ? "Скопировано" : "Копировать"}</span>
            </button>
            <button
              onClick={() => setShowPreview(!showPreview)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                showPreview
                  ? "bg-[var(--accent)]/10 text-[var(--accent)]"
                  : "text-[var(--text-secondary)] hover:bg-[var(--bg-surface)]"
              }`}
            >
              {showPreview ? <Eye size={14} /> : <Code size={14} />}
              <span className="hidden md:inline">{showPreview ? "Просмотр" : "Код"}</span>
            </button>
            {language === "html" && (
              <button
                onClick={() => setFullscreen(!fullscreen)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              >
                {fullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--accent)] text-[var(--text-on-primary)] text-xs font-medium hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Save size={14} />
              {saving ? "Сохранение..." : saved ? "Сохранено!" : "Сохранить"}
            </button>
            <button
              onClick={handleDelete}
              className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </header>

      <div className={`flex-1 flex overflow-hidden ${fullscreen ? "fixed inset-0 z-50 bg-[var(--bg-main)]" : ""}`}>
        <div className={`flex flex-col ${showPreview ? "w-1/2" : "w-full"} border-r border-[var(--bg-surface)]`}>
          <div className="flex items-center gap-2 px-4 py-2 border-b border-[var(--bg-surface)]">
            <Code size={14} className="text-[var(--text-muted)]" />
            <span className="text-xs text-[var(--text-muted)]">Редактор</span>
          </div>
          <textarea
            ref={editorRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 w-full p-4 bg-transparent text-[var(--text-primary)] font-mono text-sm leading-relaxed resize-none outline-none"
            spellCheck={false}
            placeholder="Начните писать код..."
          />
        </div>

        {showPreview && (
          <div className="w-1/2 flex flex-col">
            <div className="flex items-center gap-2 px-4 py-2 border-b border-[var(--bg-surface)]">
              <Eye size={14} className="text-[var(--text-muted)]" />
              <span className="text-xs text-[var(--text-muted)]">Просмотр</span>
              {language === "html" && (
                <button
                  onClick={() => {
                    const iframe = document.querySelector("#preview-iframe") as HTMLIFrameElement;
                    if (iframe) {
                      iframe.srcdoc = content;
                    }
                  }}
                  className="ml-auto flex items-center gap-1 text-xs text-[var(--text-secondary)] hover:text-[var(--accent)] cursor-pointer"
                >
                  <Play size={12} />
                  Обновить
                </button>
              )}
            </div>
            <div className="flex-1 bg-white">
              {language === "html" ? (
                <iframe
                  id="preview-iframe"
                  srcDoc={content}
                  className="w-full h-full border-0"
                  sandbox="allow-scripts"
                />
              ) : (
                <pre className="p-4 overflow-auto h-full">
                  <code ref={codeRef} className={`language-${language} text-sm`}>
                    {content}
                  </code>
                </pre>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
