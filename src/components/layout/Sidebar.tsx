"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import {
  MessageSquare,
  Settings,
  LogOut,
  CreditCard,
  Search,
  Image,
  Trash2,
  FolderOpen,
  Layers,
  SlidersHorizontal,
  Download,
  Sun,
  Moon,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface Conversation {
  id: string;
  title: string;
  model: string;
  created_at: string;
  updated_at: string;
}

const navItems = [
  { icon: MessageSquare, href: "/chat", label: "Чаты" },
  { icon: FolderOpen, href: "/projects", label: "Проекты" },
  { icon: Layers, href: "/artifacts", label: "Артефакты" },
  { icon: SlidersHorizontal, href: "/settings", label: "Настройки" },
];

const bottomNavItems = [
  { icon: MessageSquare, href: "/chat", label: "Чаты" },
  { icon: CreditCard, href: "/pricing", label: "Тарифы" },
  { icon: Settings, href: "/settings", label: "Ещё" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { signOut, user } = useAuth();
  const { theme, setTheme } = useTheme();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [showRecents, setShowRecents] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
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
    let cancelled = false;
    const interval = setInterval(async () => {
      const res = await fetch("/api/conversations");
      if (res.ok && !cancelled) {
        setConversations(await res.json());
      }
    }, 5000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  const handleDeleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const res = await fetch(`/api/conversations/${id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setConversations((prev) => prev.filter((c) => c.id !== id));
    }
  };

  const isActive = (href: string) => pathname === href;

  const filteredConversations = searchQuery.trim()
    ? conversations.filter((c) => c.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : conversations;

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-[260px] h-full bg-[var(--bg-sidebar)] border-r border-[var(--border)]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-[15px] font-semibold text-[var(--text-primary)]">Pixel AI</h1>
          <div className="flex items-center gap-1">
            <Link
              href="/pricing"
              className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--text-secondary)] hover:bg-[var(--border)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              title="Тарифы"
            >
              <span className="text-sm font-bold">$</span>
            </Link>
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--text-secondary)] hover:bg-[var(--border)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              title={theme === "dark" ? "Светлая тема" : "Тёмная тема"}
            >
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button
              onClick={() => { setSearchOpen(!searchOpen); if (searchOpen) setSearchQuery(""); }}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--text-secondary)] hover:bg-[var(--border)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            >
              <Search size={16} />
            </button>
          </div>
        </div>

        {/* Search panel */}
        {searchOpen && (
          <div className="px-3 pb-3">
            <div className="flex items-center gap-2 bg-[var(--bg-elevated)] rounded-lg border border-[var(--border)] px-3 py-2">
              <Search size={14} className="text-[var(--text-muted)] flex-shrink-0" />
              <input
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Найти чат..."
                className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer">
                  ✕
                </button>
              )}
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-2 py-1">
          <div className="space-y-0.5">
            {navItems.map(({ icon: Icon, href, label }, idx) => {
              const active = isActive(href);

              return (
                <Link key={idx} href={href}>
                  <div
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors cursor-pointer ${
                      active
                        ? "bg-[var(--border)] text-[var(--text-primary)]"
                        : "text-[var(--text-secondary)] hover:bg-[var(--border)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    <Icon size={16} />
                    <span className="text-[13px]">{label}</span>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Products section */}
          <div className="mt-6">
            <p className="px-3 mb-1 text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wider">
              Продукты
            </p>
            <Link href="/design">
              <div className="flex items-center gap-3 px-3 py-2 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--border)] hover:text-[var(--text-primary)] transition-colors cursor-pointer">
                <Image size={16} aria-hidden="true" />
                <span className="text-[13px]">Дизайн</span>
              </div>
            </Link>
          </div>

          {/* Recents section */}
          <div className="mt-6">
            <div className="flex items-center justify-between px-3 mb-1">
              <p className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wider">
                Недавние
              </p>
              <button
                onClick={() => setShowRecents(!showRecents)}
                className="w-6 h-6 flex items-center justify-center rounded text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors cursor-pointer"
              >
                <SlidersHorizontal size={12} />
              </button>
            </div>

            {showRecents && (
              <div className="space-y-0.5">
                {loading ? (
                  <div className="flex items-center justify-center py-6">
                    <div className="w-4 h-4 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : filteredConversations.length === 0 ? (
                  <p className="px-3 py-4 text-[12px] text-[var(--text-muted)]">
                    {searchQuery ? "Ничего не найдено" : "Пока нет чатов"}
                  </p>
                ) : (
                  filteredConversations.map((conv) => (
                    <Link
                      key={conv.id}
                      href={`/chat/${conv.id}`}
                      className="group flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-[var(--border)] transition-colors cursor-pointer"
                    >
                      <MessageSquare size={14} className="text-[var(--text-muted)] flex-shrink-0" />
                      <span className="flex-1 text-[13px] text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] truncate transition-colors">
                        {conv.title}
                      </span>
                      <button
                        onClick={(e) => handleDeleteConversation(conv.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/10 text-[var(--text-muted)] hover:text-red-500 transition-all cursor-pointer"
                      >
                        <Trash2 size={12} />
                      </button>
                    </Link>
                  ))
                )}
              </div>
            )}
          </div>
        </nav>

        {/* User profile */}
        <div className="border-t border-[var(--border)] px-3 py-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
              {user?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "N"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-[var(--text-primary)] truncate">
                {user?.full_name || user?.email || "Пользователь"}
              </p>
              <p className="text-[11px] text-[var(--text-muted)]">
                {user?.subscription_tier === "max" ? "Max план" : user?.subscription_tier === "pro" ? "Pro план" : "Бесплатный план"}
              </p>
            </div>
            <div className="flex items-center gap-0.5">
              <button className="w-7 h-7 flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--border)] transition-colors cursor-pointer">
                <Download size={14} />
              </button>
              <button
                onClick={signOut}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--border)] transition-colors cursor-pointer"
                title="Выйти"
              >
                <LogOut size={14} />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[var(--bg-sidebar)] border-t border-[var(--border)] flex items-center justify-around px-4 z-50" style={{ height: "calc(3.5rem + env(safe-area-inset-bottom, 0px))", paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
        {bottomNavItems.map(({ icon: Icon, href, label }, idx) => {
          const active = isActive(href);

          return (
            <Link key={idx} href={href}>
              <div
                className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-colors cursor-pointer ${
                  active ? "text-[var(--accent)]" : "text-[var(--text-secondary)]"
                }`}
              >
                <Icon size={20} />
                <span className="text-[10px]">{label}</span>
              </div>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
