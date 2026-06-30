"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { User, CreditCard, Save } from "lucide-react";

interface Profile {
  email: string;
  full_name: string;
}

export default function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      setProfile({ email: data.user?.email || "", full_name: data.user?.full_name || "" });
      setLoading(false);
    };
    fetchProfile();
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    await fetch("/api/auth/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ full_name: profile?.full_name || "" }),
    });
    await refreshUser();
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-[var(--bg-main)]">
        <div className="w-8 h-8 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[var(--bg-main)]">
      <header className="px-4 md:px-6 py-4 border-b border-[var(--bg-surface)]">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Настройки</h2>
      </header>

      <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-20 md:pb-8">
        <div className="max-w-2xl mx-auto space-y-6 md:space-y-8">
          <section className="rounded-3xl bg-[var(--bg-surface)]/50 border border-[var(--border)] p-4 md:p-6">
            <div className="flex items-center gap-3 mb-6">
              <User size={20} className="text-[var(--accent)]" />
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">Профиль</h3>
            </div>

            <div className="space-y-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-[var(--text-secondary)]">Email</label>
                <input
                  value={profile?.email || ""}
                  disabled
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-primary)] disabled:opacity-50 outline-none"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-[var(--text-secondary)]">Имя</label>
                <input
                  value={profile?.full_name || ""}
                  placeholder="Ваше имя"
                  onChange={(e) => setProfile({ ...profile!, full_name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:border-[var(--accent)] transition-colors"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center gap-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--accent)] text-[var(--text-on-primary)] font-medium hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50 cursor-pointer"
              >
                <Save size={16} />
                {saving ? "Сохранение..." : saved ? "Сохранено!" : "Сохранить"}
              </button>
              {saved && (
                <span className="text-sm text-green-500">Профиль обновлён</span>
              )}
            </div>
          </section>

          <section className="rounded-3xl bg-[var(--bg-surface)]/50 border border-[var(--border)] p-4 md:p-6">
            <div className="flex items-center gap-3 mb-6">
              <CreditCard size={20} className="text-[var(--accent)]" />
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">Подписка</h3>
            </div>

            <div className="space-y-4">
              <div>
                <p className="font-medium text-[var(--text-primary)]">
                  План: {user?.subscription_tier === "max" ? "Max" : user?.subscription_tier === "pro" ? "Pro" : "Free"}
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--text-secondary)]">Часовой лимит</span>
                  <span className="text-[var(--text-primary)]">
                    {user?.subscription_tier === "max" ? "∞" : `${user?.messages_used_hourly || 0} / ${user?.subscription_tier === "pro" ? 30 : 15}`}
                  </span>
                </div>
                <div className="w-full h-2 bg-[var(--bg-elevated)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[var(--accent)] rounded-full transition-all"
                    style={{
                      width: user?.subscription_tier === "max"
                        ? "100%"
                        : `${Math.min(100, ((user?.messages_used_hourly || 0) / (user?.subscription_tier === "pro" ? 30 : 15)) * 100)}%`,
                    }}
                  />
                </div>
                {user?.hourly_reset_at && (
                  <p className="text-xs text-[var(--text-muted)]">
                    Сброс через {Math.max(0, Math.ceil((new Date(user.hourly_reset_at).getTime() + 3600000 - Date.now()) / 60000))} мин
                  </p>
                )}
              </div>

              {user?.subscription_tier !== "pro" && user?.subscription_tier !== "max" && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--text-secondary)]">Недельный лимит</span>
                    <span className="text-[var(--text-primary)]">
                      {user?.messages_used_weekly || 0} / 300
                    </span>
                  </div>
                  <div className="w-full h-2 bg-[var(--bg-elevated)] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[var(--accent)] rounded-full transition-all"
                      style={{ width: `${Math.min(100, ((user?.messages_used_weekly || 0) / 300) * 100)}%` }}
                    />
                  </div>
                  {user?.weekly_reset_at && (
                    <p className="text-xs text-[var(--text-muted)]">
                      Сброс через {Math.max(0, Math.ceil((new Date(user.weekly_reset_at).getTime() + 604800000 - Date.now()) / 86400000))} дн
                    </p>
                  )}
                </div>
              )}
            </div>
          </section>

          <section className="rounded-3xl bg-[var(--bg-surface)]/50 border border-[var(--border)] p-4 md:p-6">
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">О приложении</h3>
            <div className="space-y-2 text-sm text-[var(--text-secondary)]">
              <p>Pixel AI v1.0.0</p>
              <p>Модели: Logos 2.5 / Ethos 4.1 / Aether 1.5</p>
              <p>UI: Material You (Material 3)</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
