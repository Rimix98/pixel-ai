"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Sun, Moon, Code, PenLine, BarChart3, Palette, BookOpen, Briefcase, Bot } from "lucide-react";

type Step = "credentials" | "profile";

const PREFERENCE_OPTIONS = [
  { id: "code", label: "Программирование", icon: Code },
  { id: "writing", label: "Тексты и статьи", icon: PenLine },
  { id: "analysis", label: "Анализ данных", icon: BarChart3 },
  { id: "creative", label: "Творчество", icon: Palette },
  { id: "learning", label: "Обучение", icon: BookOpen },
  { id: "business", label: "Бизнес", icon: Briefcase },
  { id: "general", label: "Общие задачи", icon: Bot },
];

export default function RegisterPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState<Step>("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [selectedPrefs, setSelectedPrefs] = useState<string[]>([]);
  const [customPref, setCustomPref] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => setMounted(true), []);

  const togglePref = (id: string) => {
    setSelectedPrefs((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const handleCredentialsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Пароли не совпадают");
      return;
    }

    if (password.length < 6) {
      setError("Пароль должен быть минимум 6 символов");
      return;
    }

    setStep("profile");
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const prefLabels = selectedPrefs
      .map((id) => PREFERENCE_OPTIONS.find((p) => p.id === id)?.label)
      .filter(Boolean);
    if (customPref.trim()) {
      prefLabels.push(customPref.trim());
    }
    const preferences = prefLabels.join(", ");

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, full_name: fullName, preferences }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Ошибка регистрации");
      setLoading(false);
    } else {
      router.push("/chat");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg-main)] p-4">
      <div className="relative w-full max-w-lg rounded-3xl bg-[var(--bg-surface)]/50 border border-[var(--border)] p-8">
        {mounted && (
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="absolute top-4 right-4 p-2 rounded-full bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        )}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            {mounted && (
              <img src="/mascot.png" alt="Pixel AI" className="w-10 h-10 rounded-full object-cover" />
            )}
            <h1 className="text-3xl font-bold text-[var(--text-primary)]">Pixel AI</h1>
          </div>
          <p className="text-[var(--text-secondary)]">Создайте аккаунт</p>
        </div>

        <div className="flex items-center justify-center gap-2 mb-8">
          <div className={`h-1.5 w-12 rounded-full transition-colors ${step === "credentials" ? "bg-[var(--accent)]" : "bg-[var(--accent)]"}`} />
          <div className={`h-1.5 w-12 rounded-full transition-colors ${step === "profile" ? "bg-[var(--accent)]" : "bg-[var(--bg-elevated)]"}`} />
        </div>

        {step === "credentials" ? (
          <>
            <h2 className="text-xl font-semibold text-center text-[var(--text-primary)] mb-6">Ваши данные</h2>

            <form onSubmit={handleCredentialsSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-[var(--text-secondary)]">Электронная почта</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  className="w-full px-4 py-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:border-[var(--accent)] transition-colors"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-[var(--text-secondary)]">Пароль</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Минимум 6 символов"
                  required
                  minLength={6}
                  className="w-full px-4 py-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:border-[var(--accent)] transition-colors"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-[var(--text-secondary)]">Подтвердите пароль</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Повторите пароль"
                  required
                  minLength={6}
                  className="w-full px-4 py-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:border-[var(--accent)] transition-colors"
                />
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-[var(--error-bg)] border border-[var(--error-border)] text-[var(--error-text)] text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 px-4 rounded-xl bg-[var(--accent)] text-[var(--text-on-primary)] font-medium hover:bg-[var(--accent-hover)] transition-colors cursor-pointer"
              >
                Далее
              </button>
            </form>
          </>
        ) : (
          <>
            <h2 className="text-xl font-semibold text-center text-[var(--text-primary)] mb-2">Расскажите о себе</h2>
            <p className="text-center text-[var(--text-secondary)] text-sm mb-6">Это поможет персонализировать ваш опыт</p>

            <form onSubmit={handleProfileSubmit} className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-[var(--text-secondary)]">Как вас зовут?</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ваше имя"
                  className="w-full px-4 py-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:border-[var(--accent)] transition-colors"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-[var(--text-secondary)]">Для чего будете использовать AI?</label>
                <div className="grid grid-cols-2 gap-2">
                  {PREFERENCE_OPTIONS.map((pref) => (
                    <button
                      key={pref.id}
                      type="button"
                      onClick={() => togglePref(pref.id)}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm transition-all cursor-pointer ${
                        selectedPrefs.includes(pref.id)
                          ? "bg-[var(--accent)]/20 border-[var(--accent)] text-[var(--text-primary)]"
                          : "bg-[var(--bg-elevated)] border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--text-muted)]"
                      }`}
                    >
                      <pref.icon size={16} />
                      <span>{pref.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-[var(--text-secondary)]">Что-то ещё важное?</label>
                <input
                  type="text"
                  value={customPref}
                  onChange={(e) => setCustomPref(e.target.value)}
                  placeholder="Например: пишу диссертацию по ИИ"
                  className="w-full px-4 py-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:border-[var(--accent)] transition-colors"
                />
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-[var(--error-bg)] border border-[var(--error-border)] text-[var(--error-text)] text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep("credentials")}
                  className="py-3 px-4 rounded-xl border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer"
                >
                  Назад
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 px-4 rounded-xl bg-[var(--accent)] text-[var(--text-on-primary)] font-medium hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-[var(--text-on-primary)] border-t-transparent rounded-full animate-spin mx-auto" />
                  ) : (
                    "Зарегистрироваться"
                  )}
                </button>
              </div>
            </form>
          </>
        )}

        <p className="mt-6 text-center text-sm text-[var(--text-secondary)]">
          Уже есть аккаунт?{" "}
          <a href="/login" className="text-[var(--accent)] font-medium hover:underline cursor-pointer">
            Войти
          </a>
        </p>
      </div>
    </div>
  );
}
