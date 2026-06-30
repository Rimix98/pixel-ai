"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Check, Copy, ExternalLink, Loader2, Clock, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface TonPaymentData {
  walletAddress: string;
  amount: number;
  comment: string;
  deepLink: string;
  tonhubLink: string;
  expiresIn: number;
}

export default function PricingPage() {
  const { user } = useAuth();
  const currentTier = user?.subscription_tier || "free";
  const [loading, setLoading] = useState<string | null>(null);
  const [tonModal, setTonModal] = useState<{
    open: boolean;
    tier: string;
    data: TonPaymentData | null;
    status: "loading" | "pending" | "completed" | "expired" | "error";
    remainingSeconds: number;
  }>({ open: false, tier: "", data: null, status: "loading", remainingSeconds: 0 });

  const [copied, setCopied] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => () => stopPolling(), [stopPolling]);

  const handleTonPay = async (tier: string) => {
    setLoading(tier);
    setTonModal({ open: true, tier, data: null, status: "loading", remainingSeconds: 0 });

    try {
      const res = await fetch("/api/ton/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      });

      const data = await res.json();
      if (!res.ok) {
        setTonModal((prev) => ({ ...prev, status: "error" }));
        setLoading(null);
        return;
      }

      setTonModal((prev) => ({ ...prev, data, status: "pending", remainingSeconds: data.expiresIn }));
      pollPaymentStatus(data.comment);
    } catch {
      setTonModal((prev) => ({ ...prev, status: "error" }));
    } finally {
      setLoading(null);
    }
  };

  const pollPaymentStatus = useCallback(
    (comment: string) => {
      stopPolling();
      pollRef.current = setInterval(async () => {
        try {
          const res = await fetch(`/api/ton/status/${comment}`);
          const data = await res.json();
          if (data.status === "completed") {
            stopPolling();
            setTonModal((prev) => ({ ...prev, status: "completed" }));
            setTimeout(() => {
              setTonModal({ open: false, tier: "", data: null, status: "loading", remainingSeconds: 0 });
              window.location.reload();
            }, 2000);
          } else if (data.status === "expired") {
            stopPolling();
            setTonModal((prev) => ({ ...prev, status: "expired" }));
          } else {
            setTonModal((prev) => ({ ...prev, remainingSeconds: data.remainingSeconds ?? prev.remainingSeconds }));
          }
        } catch {}
      }, 5000);
    },
    [stopPolling]
  );

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex flex-col min-h-screen bg-[var(--bg-main)]">
      <div className="flex-1 px-4 py-12 md:py-20">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl md:text-5xl font-bold text-[var(--text-primary)] text-center mb-6">
            Планы, которые растут вместе с вами
          </h1>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {/* Free */}
            <div className="flex flex-col rounded-3xl border border-[var(--border)] bg-[var(--bg-surface)]/30 p-6 md:p-8">
              <img src="/freePlan.png" alt="Free" className="w-12 h-12 mb-4 object-contain rounded-xl" />
              <h2 className="text-xl font-bold text-[var(--accent)] mb-1">Free</h2>
              <p className="text-sm text-[var(--text-muted)] mb-6">Знакомьтесь с Pixel AI</p>
              <div className="mb-6">
                <span className="text-4xl font-bold text-[var(--text-primary)]">0</span>
                <span className="text-sm text-[var(--text-muted)] ml-2">TON/месяц</span>
              </div>
              <button disabled className="w-full py-3 rounded-xl border border-[var(--border)] text-[var(--text-secondary)] text-sm font-medium cursor-not-allowed mb-8">
                {currentTier === "free" ? "Текущий план" : "Free"}
              </button>
              <div className="border-t border-[var(--border)] pt-6 mt-auto">
                <ul className="space-y-3">
                  {["Чат в браузере, на телефоне и десктопе", "Генерация кода и анализ данных", "Logos 1.0 модель", "15 сообщений в час", "300 сообщений в неделю"].map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-[var(--text-secondary)]">
                      <Check size={16} className="text-[var(--accent)] mt-0.5 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Pro */}
            <div className="flex flex-col rounded-3xl border border-[var(--accent)]/40 bg-[var(--bg-surface)]/30 p-6 md:p-8 shadow-lg shadow-[var(--accent)]/5">
              <img src="/proPlan.png" alt="Pro" className="w-12 h-12 mb-4 object-contain rounded-xl" />
              <h2 className="text-xl font-bold text-[var(--accent)] mb-1">Pro</h2>
              <p className="text-sm text-[var(--text-muted)] mb-6">Исследуйте, кодьте и организуйте</p>
              <div className="mb-6">
                <span className="text-4xl font-bold text-[var(--text-primary)]">0,4</span>
                <span className="text-sm text-[var(--text-muted)] ml-2">TON/месяц</span>
              </div>
              {currentTier === "pro" ? (
                <button disabled className="w-full py-3 rounded-xl border border-[var(--accent)] text-[var(--accent)] text-sm font-medium cursor-not-allowed mb-8">
                  Текущий план
                </button>
              ) : (
                <button onClick={() => handleTonPay("pro")} disabled={loading !== null} className="w-full py-3 rounded-xl bg-[var(--accent)] text-[var(--text-on-primary)] text-sm font-medium hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50 cursor-pointer mb-8 flex items-center justify-center gap-2">
                  {loading === "pro" ? <Loader2 size={16} className="animate-spin" /> : <span className="text-base"></span>}
                  Активировать Pro
                </button>
              )}
              <div className="border-t border-[var(--border)] pt-6 mt-auto">
                <p className="text-xs font-medium text-[var(--text-muted)] mb-3">Всё из Free, а также:</p>
                <ul className="space-y-3">
                  {["Ethos 1.0 модель", "Анализ изображений (бета)", "30 сообщений в час", "Без недельного лимита", "Приоритетная поддержка"].map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-[var(--text-secondary)]">
                      <Check size={16} className="text-[var(--accent)] mt-0.5 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Max */}
            <div className="flex flex-col rounded-3xl border border-[var(--border)] bg-[var(--bg-surface)]/30 p-6 md:p-8">
              <img src="/maxPlan.png" alt="Max" className="w-12 h-12 mb-4 object-contain rounded-xl" />
              <h2 className="text-xl font-bold text-[var(--accent)] mb-1">Max</h2>
              <p className="text-sm text-[var(--text-muted)] mb-6">Безлимит, приоритетный доступ</p>
              <div className="mb-6">
                <span className="text-4xl font-bold text-[var(--text-primary)]">0,8</span>
                <span className="text-sm text-[var(--text-muted)] ml-2">TON/месяц</span>
              </div>
              {currentTier === "max" ? (
                <button disabled className="w-full py-3 rounded-xl border border-[var(--accent)] text-[var(--accent)] text-sm font-medium cursor-not-allowed mb-8">
                  Текущий план
                </button>
              ) : (
                <button onClick={() => handleTonPay("max")} disabled={loading !== null} className="w-full py-3 rounded-xl bg-[var(--accent)] text-[var(--text-on-primary)] text-sm font-medium hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50 cursor-pointer mb-8 flex items-center justify-center gap-2">
                  {loading === "max" ? <Loader2 size={16} className="animate-spin" /> : <span className="text-base"></span>}
                  Активировать Max
                </button>
              )}
              <div className="border-t border-[var(--border)] pt-6 mt-auto">
                <p className="text-xs font-medium text-[var(--text-muted)] mb-3">Всё из Pro, а также:</p>
                <ul className="space-y-3">
                  {["Aether 1.0 модель", "Ранний доступ к новым функциям", "Без лимитов на сообщения", "Приоритетный доступ в часы пиковых нагрузок"].map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-[var(--text-secondary)]">
                      <Check size={16} className="text-[var(--accent)] mt-0.5 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-12 text-center">
            <p className="text-xs text-[var(--text-muted)]">
              Платежи обрабатываются через TON. Отмена в любое время.
            </p>
          </div>
        </div>
      </div>

      {/* TON Payment Modal */}
      {tonModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[var(--bg-surface)] rounded-3xl border border-[var(--border)] p-6 md:p-8 w-full max-w-md relative">
            <button
              onClick={() => { stopPolling(); setTonModal({ open: false, tier: "", data: null, status: "loading", remainingSeconds: 0 }); }}
              className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              <X size={20} />
            </button>

            {tonModal.status === "loading" && (
              <div className="flex flex-col items-center py-8">
                <Loader2 size={32} className="animate-spin text-[var(--accent)] mb-4" />
                <p className="text-sm text-[var(--text-secondary)]">Создаём платёж...</p>
              </div>
            )}

            {tonModal.status === "pending" && tonModal.data && (
              <div>
                <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1">
                  Оплата {tonModal.tier === "pro" ? "Pro" : "Max"} через TON
                </h3>
                <p className="text-sm text-[var(--text-muted)] mb-6">Переведите сумму на указанный кошелёк</p>

                <div className="space-y-4 mb-6">
                  <div className="p-4 rounded-xl bg-[var(--bg-elevated)]">
                    <p className="text-xs text-[var(--text-muted)] mb-1">Сумма</p>
                    <p className="text-2xl font-bold text-[var(--text-primary)]">{tonModal.data.amount} TON</p>
                  </div>

                  <div className="p-4 rounded-xl bg-[var(--bg-elevated)]">
                    <p className="text-xs text-[var(--text-muted)] mb-1">Адрес кошелька</p>
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-[var(--text-primary)] font-mono break-all flex-1">{tonModal.data.walletAddress}</p>
                      <button onClick={() => copyToClipboard(tonModal.data!.walletAddress, "wallet")} className="text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors flex-shrink-0">
                        {copied === "wallet" ? <Check size={16} /> : <Copy size={16} />}
                      </button>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-[var(--bg-elevated)]">
                    <p className="text-xs text-[var(--text-muted)] mb-1">Комментарий (обязательно!)</p>
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-[var(--text-primary)] font-mono flex-1">{tonModal.data.comment}</p>
                      <button onClick={() => copyToClipboard(tonModal.data!.comment, "comment")} className="text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors flex-shrink-0">
                        {copied === "comment" ? <Check size={16} /> : <Copy size={16} />}
                      </button>
                    </div>
                  </div>
                </div>

                <a href={tonModal.data.deepLink} className="w-full py-3 rounded-xl bg-[var(--accent)] text-[var(--text-on-primary)] text-sm font-medium hover:bg-[var(--accent-hover)] transition-colors flex items-center justify-center gap-2 mb-3">
                  Открыть в TON кошельке <ExternalLink size={14} />
                </a>

                <a href={tonModal.data.tonhubLink} target="_blank" rel="noopener noreferrer" className="w-full py-3 rounded-xl border border-[var(--border)] text-[var(--text-secondary)] text-sm font-medium hover:bg-[var(--bg-elevated)] transition-colors flex items-center justify-center gap-2 mb-4">
                  Открыть в Tonhub <ExternalLink size={14} />
                </a>

                <div className="flex items-center justify-center gap-2 text-[var(--text-muted)]">
                  <Clock size={14} />
                  <span className="text-sm font-mono">{formatTime(tonModal.remainingSeconds)}</span>
                </div>
                <p className="text-xs text-[var(--text-muted)] text-center mt-3">Ожидаем подтверждения... Проверка каждые 5 сек</p>
              </div>
            )}

            {tonModal.status === "completed" && (
              <div className="flex flex-col items-center py-8">
                <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
                  <Check size={32} className="text-green-500" />
                </div>
                <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1">Оплата подтверждена!</h3>
                <p className="text-sm text-[var(--text-muted)]">Ваш план активирован. Обновление...</p>
              </div>
            )}

            {tonModal.status === "expired" && (
              <div className="flex flex-col items-center py-8">
                <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
                  <Clock size={32} className="text-red-500" />
                </div>
                <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1">Время истекло</h3>
                <p className="text-sm text-[var(--text-muted)] mb-4">Создайте новый платёж.</p>
                <button onClick={() => setTonModal({ open: false, tier: "", data: null, status: "loading", remainingSeconds: 0 })} className="px-6 py-2 rounded-xl bg-[var(--accent)] text-[var(--text-on-primary)] text-sm font-medium hover:bg-[var(--accent-hover)] transition-colors">
                  Попробовать снова
                </button>
              </div>
            )}

            {tonModal.status === "error" && (
              <div className="flex flex-col items-center py-8">
                <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
                  <X size={32} className="text-red-500" />
                </div>
                <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1">Ошибка</h3>
                <p className="text-sm text-[var(--text-muted)] mb-4">Не удалось создать платёж.</p>
                <button onClick={() => setTonModal({ open: false, tier: "", data: null, status: "loading", remainingSeconds: 0 })} className="px-6 py-2 rounded-xl bg-[var(--accent)] text-[var(--text-on-primary)] text-sm font-medium hover:bg-[var(--accent-hover)] transition-colors">
                  Закрыть
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
