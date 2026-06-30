"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Plus,
  FolderOpen,
  MessageSquare,
  MoreVertical,
  Trash2,
  Pencil,
  Clock,
  ArrowUpDown,
} from "lucide-react";

interface Project {
  id: string;
  title: string;
  description: string;
  instructions: string;
  conversation_count: number;
  created_at: string;
  updated_at: string;
}

type SortKey = "updated_at" | "created_at" | "title";

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("updated_at");
  const [sortOpen, setSortOpen] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [contextMenu, setContextMenu] = useState<string | null>(null);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    const res = await fetch("/api/projects");
    if (res.ok) {
      setProjects(await res.json());
    }
    setLoading(false);
  };

  const sorted = [...projects]
    .filter((p) => p.title.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === "title") return a.title.localeCompare(b.title);
      return (
        new Date(b[sortBy]).getTime() - new Date(a[sortBy]).getTime()
      );
    });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setCreating(true);

    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle.trim(), description: newDescription.trim() }),
    });

    if (res.ok) {
      const project = await res.json();
      setProjects((prev) => [project, ...prev]);
      setShowNewModal(false);
      setNewTitle("");
      setNewDescription("");
      router.push(`/projects/${project.id}`);
    }
    setCreating(false);
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/projects/${id}`, { method: "DELETE" });
    setProjects((prev) => prev.filter((p) => p.id !== id));
    setContextMenu(null);
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    return d.toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const sortLabels: Record<SortKey, string> = {
    updated_at: "Последнее обновление",
    created_at: "Дата создания",
    title: "Название",
  };

  return (
    <div className="flex flex-col h-full bg-[var(--bg-main)]">
      <header className="px-4 md:px-6 py-4 border-b border-[var(--bg-surface)]">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-2">
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">Проекты</h2>
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => setSortOpen(!sortOpen)}
                className="flex items-center gap-1.5 px-2 md:px-3 py-1.5 rounded-lg border border-[var(--border)] text-xs md:text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors cursor-pointer"
              >
                <span className="hidden md:inline text-[var(--text-muted)]">Сортировка</span>
                <span className="font-medium">{sortLabels[sortBy]}</span>
                <ArrowUpDown size={14} />
              </button>
              {sortOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setSortOpen(false)} />
                  <div className="absolute right-0 mt-1 w-48 bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl shadow-lg z-50 overflow-hidden">
                    {(["updated_at", "created_at", "title"] as SortKey[]).map((key) => (
                      <button
                        key={key}
                        onClick={() => {
                          setSortBy(key);
                          setSortOpen(false);
                        }}
                        className={`w-full px-4 py-2.5 text-left text-sm transition-colors cursor-pointer ${
                          sortBy === key
                            ? "bg-[var(--bg-primary-container)] text-[var(--accent)]"
                            : "text-[var(--text-primary)] hover:bg-[var(--border)]"
                        }`}
                      >
                        {sortLabels[key]}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <button
              onClick={() => setShowNewModal(true)}
              className="flex items-center gap-1.5 px-3 md:px-4 py-2 rounded-lg bg-[var(--accent)] text-[var(--text-on-primary)] text-xs md:text-sm font-medium hover:bg-[var(--accent-hover)] transition-colors cursor-pointer"
            >
              <Plus size={16} />
              <span className="hidden md:inline">Новый проект</span>
              <span className="md:hidden">Новый</span>
            </button>
          </div>
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
              placeholder="Поиск проектов..."
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:border-[var(--accent)] transition-colors"
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : sorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-20 h-20 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] flex items-center justify-center mb-6">
                <FolderOpen size={40} className="text-[var(--text-muted)]" />
              </div>
              <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">
                Хотите начать проект?
              </h3>
              <p className="text-sm text-[var(--text-secondary)] max-w-sm mb-6">
                Загружайте материалы, настраивайте инструкции и организуйте беседы в одном месте.
              </p>
              <button
                onClick={() => setShowNewModal(true)}
                className="px-5 py-2.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)] text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--border)] transition-colors cursor-pointer"
              >
                Новый проект
              </button>
            </div>
          ) : (
            <div className="grid gap-3">
              {sorted.map((project) => (
                <div
                  key={project.id}
                  className="group flex items-center gap-4 px-5 py-4 rounded-xl bg-[var(--bg-surface)]/50 border border-[var(--border)] hover:border-[var(--accent)]/30 hover:bg-[var(--bg-surface)] transition-all cursor-pointer"
                  onClick={() => router.push(`/projects/${project.id}`)}
                >
                  <div className="w-10 h-10 rounded-xl bg-[var(--accent)]/10 flex items-center justify-center flex-shrink-0">
                    <FolderOpen size={20} className="text-[var(--accent)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-[var(--text-primary)] truncate">
                      {project.title}
                    </h4>
                    <div className="flex items-center gap-3 mt-1">
                      {project.description && (
                        <p className="text-xs text-[var(--text-muted)] truncate max-w-xs">
                          {project.description}
                        </p>
                      )}
                      <div className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                        <MessageSquare size={12} />
                        <span>{project.conversation_count}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                      <Clock size={12} />
                      <span>{formatDate(project.updated_at)}</span>
                    </div>
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setContextMenu(contextMenu === project.id ? null : project.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-[var(--border)] transition-all cursor-pointer"
                      >
                        <MoreVertical size={14} className="text-[var(--text-muted)]" />
                      </button>
                      {contextMenu === project.id && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setContextMenu(null)} />
                          <div className="absolute right-0 mt-1 w-40 bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl shadow-lg z-50 overflow-hidden">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/projects/${project.id}`);
                              }}
                              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-[var(--text-primary)] hover:bg-[var(--border)] transition-colors cursor-pointer"
                            >
                              <Pencil size={14} />
                              Открыть
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(project.id);
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
              ))}
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
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1">Новый проект</h3>
              <p className="text-sm text-[var(--text-secondary)] mb-5">
                Create a space to organize your conversations.
              </p>

              <form onSubmit={handleCreate} className="space-y-4">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-[var(--text-secondary)]">Название</label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Название проекта"
                    autoFocus
                    className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:border-[var(--accent)] transition-colors"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-[var(--text-secondary)]">Описание (необязательно)</label>
                  <textarea
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="О чём этот проект?"
                    rows={3}
                    className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:border-[var(--accent)] transition-colors resize-none"
                  />
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
