"use client";

import { Sidebar } from "@/components/layout/Sidebar";
import { useAuth } from "@/hooks/useAuth";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center bg-[var(--bg-deepest)]" style={{ height: "100dvh" }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
          <p className="text-[var(--text-secondary)]">Загрузка...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex bg-[var(--bg-deepest)]" style={{ height: "100dvh" }}>
      <Sidebar />
      <main className="flex-1 overflow-y-auto pb-20 md:pb-0">{children}</main>
    </div>
  );
}
