"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Plus,
  MessageSquare,
  Settings,
  Pencil,
  Save,
  Trash2,
  FileText,
  BookOpen,
} from "lucide-react";

interface Project {
  id: string;
  title: string;
  description: string;
  instructions: string;
  created_at: string;
  updated_at: string;
}

interface Conversation {
  id: string;
  title: string;
  model: string;
  created_at: string;
  updated_at: string;
}

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editInstructions, setEditInstructions] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchProject();
  }, [id]);

  const fetchProject = async () => {
    const res = await fetch(`/api/projects/${id}`);
    if (res.ok) {
      const data = await res.json();
      setProject(data);
      setConversations(data.conversations || []);
      setEditTitle(data.title);
      setEditDescription(data.description);
      setEditInstructions(data.instructions);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const res = await fetch(`/api/projects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: editTitle.trim(),
        description: editDescription.trim(),
        instructions: editInstructions.trim(),
      }),
    });
    if (res.ok) {
      const updated = await res.json();
      setProject(updated);
    }
    setEditing(false);
    setSaving(false);
  };

  const handleNewChat = async () => {
    const res = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Новый чат" }),
    });
    if (res.ok) {
      const conv = await res.json();
      await fetch(`/api/conversations/${conv.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: id }),
      });
      setConversations((prev) => [conv, ...prev]);
      router.push(`/chat/${conv.id}`);
    }
  };

  const handleDeleteConversation = async (convId: string) => {
    await fetch(`/api/conversations/${convId}`, { method: "DELETE" });
    setConversations((prev) => prev.filter((c) => c.id !== convId));
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-[var(--bg-main)]">
        <div className="w-8 h-8 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex h-full items-center justify-center bg-[var(--bg-main)]">
        <p className="text-[var(--text-muted)]">Проект не найден</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[var(--bg-main)]">
      <header className="px-4 md:px-6 py-3 border-b border-[var(--bg-surface)]">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <button
            onClick={() => router.push("/projects")}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1 min-w-0">
            {editing ? (
              <input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--accent)] text-[var(--text-primary)] outline-none text-sm font-medium"
                autoFocus
              />
            ) : (
              <h2 className="text-sm font-semibold text-[var(--text-primary)] truncate">
                {project.title}
              </h2>
            )}
          </div>
          <div className="flex items-center gap-2">
            {editing ? (
              <>
                <button
                  onClick={() => setEditing(false)}
                  className="px-3 py-1.5 rounded-lg text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !editTitle.trim()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--accent)] text-[var(--text-on-primary)] text-sm font-medium hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <Save size={14} />
                  {saving ? "Сохранение..." : "Сохранить"}
                </button>
              </>
            ) : (
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              >
                <Settings size={14} />
                Настройки
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          {editing && (
            <section className="rounded-xl bg-[var(--bg-surface)]/50 border border-[var(--border)] p-5 space-y-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-[var(--text-secondary)] flex items-center gap-2">
                  <FileText size={14} />
                  Описание
                </label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="О чём этот проект?"
                  rows={2}
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:border-[var(--accent)] transition-colors resize-none"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-[var(--text-secondary)] flex items-center gap-2">
                  <BookOpen size={14} />
                  Пользовательские инструкции
                </label>
                <textarea
                  value={editInstructions}
                  onChange={(e) => setEditInstructions(e.target.value)}
                  placeholder="Set custom instructions for AI in this project..."
                  rows={4}
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:border-[var(--accent)] transition-colors resize-none"
                />
              </div>
            </section>
          )}

          {!editing && project.description && (
            <p className="text-sm text-[var(--text-secondary)]">{project.description}</p>
          )}

          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Беседы ({conversations.length})
            </h3>
            <button
              onClick={handleNewChat}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--accent)] text-[var(--text-on-primary)] text-sm font-medium hover:bg-[var(--accent-hover)] transition-colors cursor-pointer"
            >
              <Plus size={14} />
              Новый чат
            </button>
          </div>

          {conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] flex items-center justify-center mb-4">
                <MessageSquare size={28} className="text-[var(--text-muted)]" />
              </div>
              <p className="text-sm text-[var(--text-muted)] mb-4">Пока нет бесед</p>
              <button
                onClick={handleNewChat}
                className="px-4 py-2 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)] text-sm text-[var(--text-primary)] hover:bg-[var(--border)] transition-colors cursor-pointer"
              >
                Начать беседу
              </button>
            </div>
          ) : (
            <div className="grid gap-2">
              {conversations.map((conv) => (
                <div
                  key={conv.id}
                  className="group flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[var(--bg-surface)]/50 transition-colors cursor-pointer"
                  onClick={() => router.push(`/chat/${conv.id}`)}
                >
                  <MessageSquare size={16} className="text-[var(--text-muted)] flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[var(--text-primary)] truncate">{conv.title}</p>
                    <p className="text-xs text-[var(--text-muted)]">{formatDate(conv.updated_at)}</p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteConversation(conv.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-500/10 text-[var(--text-muted)] hover:text-red-500 transition-all cursor-pointer"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
