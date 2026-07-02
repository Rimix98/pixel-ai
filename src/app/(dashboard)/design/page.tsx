"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Image, Loader2, Download, Sparkles } from "lucide-react";

const PRESET_SIZES = [
  { label: "1:1", width: 1024, height: 1024 },
  { label: "16:9", width: 1024, height: 576 },
  { label: "9:16", width: 576, height: 1024 },
  { label: "4:3", width: 1024, height: 768 },
  { label: "3:4", width: 768, height: 1024 },
];

export default function DesignPage() {
  const { user } = useAuth();
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState(0);
  const [remaining, setRemaining] = useState<number | null>(null);

  const tier = user?.subscription_tier || "free";
  const limits: Record<string, number> = { free: 10, pro: 20, max: 30 };

  useEffect(() => {
    fetch("/api/design/quota")
      .then((r) => r.json())
      .then((d) => setRemaining(d.remaining))
      .catch(() => {});
  }, []);

  const handleGenerate = async () => {
    if (!prompt.trim() || loading) return;

    setLoading(true);
    setError(null);
    setImageUrl(null);

    const size = PRESET_SIZES[selectedSize];

    try {
      const res = await fetch("/api/design/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          width: size.width,
          height: size.height,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Ошибка генерации");
        return;
      }

      setImageUrl(data.url);
      if (data.remaining !== undefined) {
        setRemaining(data.remaining);
      }
    } catch {
      setError("Ошибка сети. Попробуйте снова.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!imageUrl) return;
    try {
      const res = await fetch(imageUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `pixel-ai-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // Download failed silently
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[var(--border)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Sparkles size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-[var(--text-primary)]">Генерация изображений</h1>
              <p className="text-sm text-[var(--text-secondary)]">
                Создавайте уникальные изображения с помощью ИИ
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-[var(--text-secondary)]">
              Осталось: <span className="font-semibold text-[var(--text-primary)]">{remaining ?? limits[tier]}</span> / {limits[tier]}
            </p>
            <p className="text-xs text-[var(--text-muted)]">дней</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Input */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                Описание изображения
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Например: Космический корабль летит над неоновым городом в стиле киберпанк, высокая детализация, драматическое освещение"
                className="w-full h-32 px-4 py-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-primary)] placeholder-[var(--text-muted)] resize-none focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-all"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    handleGenerate();
                  }
                }}
              />
            </div>

            {/* Size presets */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                Формат
              </label>
              <div className="flex flex-wrap gap-2">
                {PRESET_SIZES.map((size, i) => (
                  <button
                    key={size.label}
                    onClick={() => setSelectedSize(i)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                      selectedSize === i
                        ? "bg-[var(--accent)] text-white"
                        : "bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:bg-[var(--border)]"
                    }`}
                  >
                    {size.label}
                    <span className="ml-1 text-xs opacity-70">
                      {size.width}x{size.height}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Generate button */}
            <button
              onClick={handleGenerate}
              disabled={!prompt.trim() || loading}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[var(--accent)] text-white font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Генерация...
                </>
              ) : (
                <>
                  <Image size={18} />
                  Сгенерировать
                </>
              )}
            </button>

            {/* Error */}
            {error && (
              <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
                {error}
              </div>
            )}

            {/* Hint */}
            <p className="text-xs text-[var(--text-muted)] text-center">
              Ctrl+Enter для быстрой генерации
            </p>
          </div>

          {/* Result */}
          {imageUrl && (
            <div className="space-y-4">
              <div className="relative rounded-xl overflow-hidden border border-[var(--border)] bg-[var(--bg-elevated)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrl}
                  alt={prompt}
                  className="w-full h-auto"
                />
              </div>
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--border)] transition-colors cursor-pointer"
              >
                <Download size={16} />
                Скачать
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
