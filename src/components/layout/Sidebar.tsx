"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import {
  MessageSquare, Settings, LogOut, CreditCard, Search, Trash2,
  FolderOpen, Layers, PanelLeft, Plus, X, Sun, Moon,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface Conversation {
  id: string;
  title: string;
  model: string;
  created_at: string;
  updated_at: string;
}

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

const navItems = [
  { icon: MessageSquare, href: "/chat", label: "Чаты" },
  { icon: FolderOpen, href: "/projects", label: "Проекты" },
  { icon: Layers, href: "/artifacts", label: "Артефакты" },
  { icon: Settings, href: "/settings", label: "Настройки" },
];

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { signOut, user } = useAuth();
  const { theme, setTheme } = useTheme();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const res = await fetch("/api/conversations");
      if (res.ok) {
        const data = await res.json();
        if (!cancelled) setConversations(data);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const handleUpdate = () => {
      fetch("/api/conversations")
        .then((res) => (res.ok ? res.json() : []))
        .then((data) => setConversations(data))
        .catch(() => {});
    };

    window.addEventListener("conversations-updated", handleUpdate);
    return () => window.removeEventListener("conversations-updated", handleUpdate);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const interval = setInterval(async () => {
      const res = await fetch("/api/conversations");
      if (res.ok && !cancelled) setConversations(await res.json());
    }, 5000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    await fetch(`/api/conversations/${id}`, { method: "DELETE" });
    setConversations((prev) => prev.filter((c) => c.id !== id));
  };

  const isActive = (href: string) => pathname === href;

  const filtered = searchQuery.trim()
    ? conversations.filter((c) => c.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : conversations;

  const tierLabel = user?.subscription_tier === "max" ? "Max" : user?.subscription_tier === "pro" ? "Pro" : "Free";

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[var(--bg-sidebar)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <h1 className="text-[15px] font-semibold text-[var(--text-primary)]">Pixel AI</h1>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--text-secondary)] hover:bg-[var(--border)] transition-colors cursor-pointer"
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button
            onClick={onClose}
            className="md:hidden w-8 h-8 flex items-center justify-center rounded-lg text-[var(--text-secondary)] hover:bg-[var(--border)] transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* New Chat */}
      <div className="px-3 pb-2">
        <Link
          href="/chat"
          onClick={onClose}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-[13px] text-[var(--text-secondary)] hover:bg-[var(--border)] hover:text-[var(--text-primary)] transition-colors"
        >
          <Plus size={16} />
          Новый чат
        </Link>
      </div>

      {/* Search */}
      <div className="px-3 pb-2">
        <div className="flex items-center gap-2 bg-[var(--bg-elevated)] rounded-lg border border-[var(--border)] px-3 py-2">
          <Search size={14} className="text-[var(--text-muted)] flex-shrink-0" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск..."
            className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none"
          />
        </div>
      </div>

      {/* Navigation */}
      <nav className="px-2 py-1">
        {navItems.map(({ icon: Icon, href, label }) => (
          <Link key={href} href={href} onClick={onClose}>
            <div className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors cursor-pointer ${
              isActive(href)
                ? "bg-[var(--border)] text-[var(--text-primary)]"
                : "text-[var(--text-secondary)] hover:bg-[var(--border)] hover:text-[var(--text-primary)]"
            }`}>
              <Icon size={16} />
              <span className="text-[13px]">{label}</span>
            </div>
          </Link>
        ))}
      </nav>

      {/* Recents */}
      <div className="flex-1 overflow-y-auto px-2 mt-2">
        <p className="px-3 mb-1 text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wider">Недавние</p>
        <div className="space-y-0.5">
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <div className="w-4 h-4 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="px-3 py-2 text-[12px] text-[var(--text-muted)]">
              {searchQuery ? "Ничего не найдено" : "Нет чатов"}
            </p>
          ) : (
            filtered.slice(0, 10).map((conv) => (
              <Link
                key={conv.id}
                href={`/chat/${conv.id}`}
                onClick={onClose}
                className="group flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-[var(--border)] transition-colors cursor-pointer"
              >
                <MessageSquare size={14} className="text-[var(--text-muted)] flex-shrink-0" />
                <span className="flex-1 text-[13px] text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] truncate">
                  {conv.title}
                </span>
                <button
                  onClick={(e) => handleDelete(conv.id, e)}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/10 text-[var(--text-muted)] hover:text-red-500 transition-all cursor-pointer"
                >
                  <Trash2 size={12} />
                </button>
              </Link>
            ))
          )}
        </div>
      </div>

      {/* User */}
      <div className="border-t border-[var(--border)] px-3 py-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
            {user?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "N"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium text-[var(--text-primary)] truncate">
              {user?.full_name || user?.email || "Пользователь"}
            </p>
            <p className="text-[11px] text-[var(--text-muted)]">{tierLabel} план</p>
          </div>
          <button
            onClick={signOut}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
            title="Выйти"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-[260px] h-full border-r border-[var(--border)]">
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      <div
        className={`md:hidden fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />
      <div
        className={`md:hidden fixed inset-y-0 left-0 w-72 z-50 shadow-2xl transition-transform duration-300 ease-in-out ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {sidebarContent}
      </div>
    </>
  );
}
