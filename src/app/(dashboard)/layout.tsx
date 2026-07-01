"use client";

import { useState } from "react";
import Link from "next/link";
import { Sidebar } from "@/components/layout/Sidebar";
import { useAuth } from "@/hooks/useAuth";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { loading, user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const tier = user?.subscription_tier || "free";
  const tierLabel = tier === "max" ? "Max" : tier === "pro" ? "Pro" : "Free";

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
    <div className="flex h-screen bg-[var(--bg-deepest)]">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="flex-1 overflow-y-auto">
        <div className="md:hidden sticky top-0 z-20 flex items-center justify-between px-4 py-2 border-b border-[var(--border)] bg-[var(--bg-sidebar)]">
          <button
            onClick={() => setSidebarOpen(true)}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--text-secondary)] hover:bg-[var(--border)] transition-colors cursor-pointer"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <span className="text-sm font-semibold text-[var(--text-primary)]">Pixel AI</span>
          {tier !== "max" ? (
            <Link
              href="/pricing"
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-[var(--accent)]/15 text-[var(--accent)] text-[10px] font-bold hover:bg-[var(--accent)]/25 transition-colors"
            >
              {tierLabel}
            </Link>
          ) : (
            <div className="w-8" />
          )}
        </div>
        {children}
      </main>
    </div>
  );
}
