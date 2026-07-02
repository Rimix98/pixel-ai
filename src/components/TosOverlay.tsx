"use client";

import { useState } from "react";
import { FileText, Shield } from "lucide-react";

interface TosOverlayProps {
  onAccepted: () => void;
}

export function TosOverlay({ onAccepted }: TosOverlayProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleAccept = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/accept-tos", { method: "POST" });
      if (res.ok) {
        onAccepted();
      } else {
        const data = await res.json();
        setError(data.error || "Ошибка при принятии условий");
        setLoading(false);
      }
    } catch {
      setError("Ошибка сети");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-[var(--bg-main)]">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-10 md:py-16">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[var(--accent)]/10 mb-4">
              <Shield className="w-8 h-8 text-[var(--accent)]" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)] mb-2">
              Обновление условий
            </h1>
            <p className="text-[var(--text-secondary)]">
              Пожалуйста, ознакомьтесь и примите обновлённые условия использования и политику конфиденциальности для продолжения работы с Сервисом.
            </p>
          </div>

          <div className="space-y-8 text-[var(--text-secondary)] leading-relaxed">
            <section>
              <div className="flex items-center gap-3 mb-3">
                <FileText className="w-5 h-5 text-[var(--accent)]" />
                <h2 className="text-xl font-semibold text-[var(--text-primary)]">Условия использования</h2>
              </div>
              <div className="space-y-3">
                <p>
                  Используя Pixel AI, вы соглашаетесь с нашими условиями использования. Основные положения:
                </p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Вы несёте ответственность за сохранность своего аккаунта и пароля</li>
                  <li>Сервис предоставляется «как есть» без гарантий бесперебойной работы</li>
                  <li>Вы обязуетесь использовать Сервис только в законных целях</li>
                  <li>Оплаченные подписки не подлежат возврату (за исключением случаев по закону)</li>
                  <li>Мы можем изменять условия с уведомлением пользователей</li>
                </ul>
                <p>
                  Полный текст доступен на странице{" "}
                  <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] hover:underline">
                    Условия использования
                  </a>.
                </p>
              </div>
            </section>

            <div className="border-t border-[var(--border)]" />

            <section>
              <div className="flex items-center gap-3 mb-3">
                <Shield className="w-5 h-5 text-[var(--accent)]" />
                <h2 className="text-xl font-semibold text-[var(--text-primary)]">Политика конфиденциальности</h2>
              </div>
              <div className="space-y-3">
                <p>
                  Мы заботимся о защите ваших данных. Основные моменты нашей политики конфиденциальности:
                </p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Мы собираем только необходимые данные для работы Сервиса</li>
                  <li>Пароли хранятся в захешированном виде</li>
                  <li>Мы не продаём вашу личную информацию третьим лицам</li>
                  <li>Сообщения чата передаются провайдерам ИИ для генерации ответов</li>
                  <li>Вы имеете право на доступ, исправление и удаление ваших данных</li>
                </ul>
                <p>
                  Полный текст доступен на странице{" "}
                  <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] hover:underline">
                    Политика конфиденциальности
                  </a>.
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 bg-[var(--bg-main)] border-t border-[var(--border)] px-4 py-4">
        <div className="max-w-3xl mx-auto flex flex-col items-center gap-3">
          {error && (
            <div className="w-full p-3 rounded-xl bg-[var(--error-bg)] border border-[var(--error-border)] text-[var(--error-text)] text-sm text-center">
              {error}
            </div>
          )}
          <button
            onClick={handleAccept}
            disabled={loading}
            className="w-full max-w-xs py-3 px-6 rounded-xl bg-[var(--accent)] text-[var(--text-on-primary)] font-medium hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-[var(--text-on-primary)] border-t-transparent rounded-full animate-spin mx-auto" />
            ) : (
              "Принять условия"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
