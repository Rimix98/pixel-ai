"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Plus,
  Layers,
  Code,
  FileText,
  MoreVertical,
  Trash2,
  Pencil,
  Clock,
} from "lucide-react";

interface Artifact {
  id: string;
  title: string;
  content: string;
  language: string;
  type: string;
  created_at: string;
  updated_at: string;
}

const typeIcons: Record<string, typeof Code> = {
  code: Code,
  document: FileText,
  markdown: FileText,
};

export default function ArtifactsPage() {
  const router = useRouter();
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showNewModal, setShowNewModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newLanguage, setNewLanguage] = useState("html");
  const [creating, setCreating] = useState(false);
  const [contextMenu, setContextMenu] = useState<string | null>(null);

  useEffect(() => {
    fetchArtifacts();
  }, []);

  const fetchArtifacts = async () => {
    const res = await fetch("/api/artifacts");
    if (res.ok) {
      setArtifacts(await res.json());
    }
    setLoading(false);
  };

  const filtered = artifacts.filter((a) =>
    a.title.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setCreating(true);

    const res = await fetch("/api/artifacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: newTitle.trim(),
        language: newLanguage,
        type: "code",
      }),
    });

    if (res.ok) {
      const artifact = await res.json();
      setArtifacts((prev) => [artifact, ...prev]);
      setShowNewModal(false);
      setNewTitle("");
      router.push(`/artifacts/${artifact.id}`);
    }
    setCreating(false);
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/artifacts/${id}`, { method: "DELETE" });
    setArtifacts((prev) => prev.filter((a) => a.id !== id));
    setContextMenu(null);
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  return (
    <div className="flex flex-col h-full bg-[var(--bg-main)]">
      <header className="px-4 md:px-6 py-4 border-b border-[var(--bg-surface)]">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-2">
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">Артефакты</h2>
          <button
            onClick={() => setShowNewModal(true)}
            className="flex items-center gap-1.5 px-3 md:px-4 py-2 rounded-lg bg-[var(--accent)] text-[var(--text-on-primary)] text-xs md:text-sm font-medium hover:bg-[var(--accent-hover)] transition-colors cursor-pointer"
          >
            <Plus size={16} />
            <span className="hidden md:inline">Новый артефакт</span>
            <span className="md:hidden">Новый</span>
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6">
        <div className="max-w-5xl mx-auto">
          <div className="relative mb-6">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск артефактов..."
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:border-[var(--accent)] transition-colors"
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-20 h-20 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] flex items-center justify-center mb-6">
                <Layers size={40} className="text-[var(--text-muted)]" />
              </div>
              <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">
                Что вы создадите с артефактами?
              </h3>
              <p className="text-sm text-[var(--text-secondary)] max-w-sm mb-6">
                Если можете представить — можете создать.
              </p>
              <button
                onClick={() => setShowNewModal(true)}
                className="px-5 py-2.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)] text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--border)] transition-colors cursor-pointer"
              >
                Новый артефакт
              </button>
            </div>
          ) : (
            <div className="grid gap-3">
              {filtered.map((artifact) => {
                const Icon = typeIcons[artifact.type] || Code;
                return (
                  <div
                    key={artifact.id}
                    className="group flex items-center gap-4 px-5 py-4 rounded-xl bg-[var(--bg-surface)]/50 border border-[var(--border)] hover:border-[var(--accent)]/30 hover:bg-[var(--bg-surface)] transition-all cursor-pointer"
                    onClick={() => router.push(`/artifacts/${artifact.id}`)}
                  >
                    <div className="w-10 h-10 rounded-xl bg-[var(--accent)]/10 flex items-center justify-center flex-shrink-0">
                      <Icon size={20} className="text-[var(--accent)]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-[var(--text-primary)] truncate">
                        {artifact.title}
                      </h4>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-[var(--text-muted)] uppercase">
                          {artifact.language}
                        </span>
                        <span className="text-xs text-[var(--text-muted)]">
                          {artifact.content ? `${artifact.content.split("\n").length} строк` : "Пусто"}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                        <Clock size={12} />
                        <span>{formatDate(artifact.updated_at)}</span>
                      </div>
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setContextMenu(contextMenu === artifact.id ? null : artifact.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-[var(--border)] transition-all cursor-pointer"
                        >
                          <MoreVertical size={14} className="text-[var(--text-muted)]" />
                        </button>
                        {contextMenu === artifact.id && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setContextMenu(null)} />
                            <div className="absolute right-0 mt-1 w-40 bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl shadow-lg z-50 overflow-hidden">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  router.push(`/artifacts/${artifact.id}`);
                                }}
                                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-[var(--text-primary)] hover:bg-[var(--border)] transition-colors cursor-pointer"
                              >
                                <Pencil size={14} />
                                Открыть
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(artifact.id);
                                }}
                                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                              >
                                <Trash2 size={14} />
                                Удалить
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {showNewModal && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowNewModal(false)} />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div
              className="w-full max-w-lg bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl shadow-2xl p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1">Новый артефакт</h3>
              <p className="text-sm text-[var(--text-secondary)] mb-5">
                Create a code artifact, document, or template.
              </p>

              <form onSubmit={handleCreate} className="space-y-4">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-[var(--text-secondary)]">Название</label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Название артефакта"
                    autoFocus
                    className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:border-[var(--accent)] transition-colors"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-[var(--text-secondary)]">Язык</label>
                  <div className="flex flex-wrap gap-2">
                    {["html", "javascript", "typescript", "python", "css", "json", "markdown"].map((lang) => (
                      <button
                        key={lang}
                        type="button"
                        onClick={() => setNewLanguage(lang)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                          newLanguage === lang
                            ? "bg-[var(--accent)]/20 border-[var(--accent)] text-[var(--accent)]"
                            : "bg-[var(--bg-elevated)] border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--text-muted)]"
                        }`}
                      >
                        {lang}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowNewModal(false)}
                    className="px-4 py-2.5 rounded-xl text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    disabled={!newTitle.trim() || creating}
                    className="px-5 py-2.5 rounded-xl bg-[var(--accent)] text-[var(--text-on-primary)] text-sm font-medium hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {creating ? "Создание..." : "Создать"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
