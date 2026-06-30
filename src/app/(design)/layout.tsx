"use client";

import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function DesignLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--bg-deepest)]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
          <p className="text-[var(--text-secondary)]">Загрузка...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[var(--bg-main)]">
      <header className="flex items-center gap-3 px-4 py-2 border-b border-[var(--border)] bg-[var(--bg-surface)]/50">
        <Link
          href="/chat"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-[var(--text-secondary)] hover:bg-[var(--border)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
        >
          <ArrowLeft size={14} />
          Вернуться в чат
        </Link>
        <div className="flex items-center gap-1.5 ml-2">
          <Sparkles size={14} className="text-[var(--accent)]" />
          <span className="text-xs font-medium text-[var(--text-primary)]">Pixel Design</span>
        </div>
      </header>
      <div className="flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  );
}
