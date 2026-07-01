"use client";

import { useState, useRef, useEffect, createElement } from "react";
import { Send, Plus, ChevronDown, Lock, Mic, PenLine, GraduationCap, Coffee, Code, X, AlertTriangle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { getGreetingTemplate, renderGreeting } from "@/lib/greeting";
import { canUseModel } from "@/lib/constants";

const modelOptions = [
  { name: "Aether 1.0", minTier: "max" },
  { name: "Ethos 1.0", minTier: "pro" },
  { name: "Logos 1.0", minTier: "free" },
];

const suggestions: Array<{ icon?: LucideIcon; mascot?: boolean; label: string; prompt: string }> = [
  { icon: PenLine, label: "Написать", prompt: "Напиши мне эссе на тему" },
  { icon: GraduationCap, label: "Учиться", prompt: "Объясни мне концепцию" },
  { icon: Code, label: "Код", prompt: "Напиши код для" },
  { icon: Coffee, label: "Бытовое", prompt: "Помоги мне с" },
  { mascot: true, label: "Pixel choice", prompt: "Придумай что-нибудь интересное" },
];

export default function ChatPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [greeting, setGreeting] = useState("");
  const [mounted, setMounted] = useState(false);
  const [modelName, setModelName] = useState("Logos 1.0");
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSmiling, setIsSmiling] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const greetingRef = useRef("");

  useEffect(() => {
    greetingRef.current = getGreetingTemplate(false);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (greetingRef.current) {
      setGreeting(renderGreeting(greetingRef.current, user?.full_name));
    }
  }, [user]);

  const handleMascotClick = () => {
    setIsSmiling(true);
    window.setTimeout(() => setIsSmiling(false), 2500);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || file.size > 10 * 1024 * 1024) return;
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && !imagePreview) || isLoading) return;

    const conversationId = crypto.randomUUID();
    const messageContent = input.trim() || "Проанализируй это изображение";
    setIsLoading(true);
    setError(null);
    try {
      const chatResponse = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          messages: [
            {
              role: "user",
              content: messageContent,
              ...(imagePreview ? { image: imagePreview } : {}),
            },
          ],
        }),
      });

      if (!chatResponse.ok) {
        const errData = await chatResponse.json().catch(() => ({}));
        throw new Error(errData.error || errData.details || "Failed to get response");
      }

      await chatResponse.text();
      window.dispatchEvent(new Event("conversations-updated"));
      router.push(`/chat/${conversationId}`);
      return;
    } catch (err: any) {
      setError(err?.message || "Произошла ошибка. Попробуйте снова.");
    }
    setIsLoading(false);
  };

  const tier = user?.subscription_tier || "free";
  const tierLabel = tier === "max" ? "Max" : tier === "pro" ? "Pro" : "Free";

  return (
    <div className="flex flex-col h-full bg-[var(--bg-main)]">
      {/* Upgrade banner (mobile hidden, desktop shown) */}
      {tier !== "max" && (
        <div className="hidden md:flex items-center justify-center gap-2 px-4 py-1.5 bg-[var(--accent)]/10 border-b border-[var(--accent)]/20 text-xs text-[var(--text-primary)]">
          <span className="font-medium">{tierLabel} план</span>
          <Link href="/pricing" className="underline underline-offset-2 text-[var(--accent)] hover:opacity-80">
            Обновиться
          </Link>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-500/10 border-b border-red-500/20 text-red-500 text-sm">
          <AlertTriangle size={16} />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto opacity-50 hover:opacity-100 cursor-pointer"><X size={12} /></button>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        tabIndex={-1}
        aria-hidden="true"
        style={{ position: "fixed", top: -9999, left: -9999, opacity: 0, width: 1, height: 1 }}
        onChange={handleImageSelect}
      />

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center text-center px-4 pb-24 md:pb-0">
        {/* Greeting */}
        <div className="mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <button
              type="button"
              onClick={handleMascotClick}
              className="w-10 h-10 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)]/80 flex items-center justify-center overflow-hidden shadow-sm hover:scale-105 transition-transform cursor-pointer"
              aria-label="Улыбнуть маскота"
            >
              <img
src={isSmiling ? "/smileyMascot.png" : "/mascot.png"}
                alt="Pixel AI"
                className="w-full h-full object-cover"
                suppressHydrationWarning
              />
            </button>
          </div>
          <h1 className="text-2xl md:text-4xl font-light text-[var(--text-primary)]">
            {mounted ? greeting : "\u00A0"}
          </h1>
        </div>

        {/* Suggestion chips */}
        <div className="flex flex-wrap gap-2 justify-center">
          {suggestions.map(({ icon: Icon, mascot, label, prompt }) => (
            <button
              key={label}
              onClick={() => {
                setInput(prompt);
                inputRef.current?.focus();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--bg-surface)]/50 border border-[var(--border)] text-xs text-[var(--text-primary)] hover:bg-[var(--border)] transition-all cursor-pointer"
            >
              {mascot ? (
                <img src="/mascot.png" alt="" aria-hidden="true" className="w-3.5 h-3.5 rounded-full object-cover" />
              ) : Icon ? (
                createElement(Icon, { size: 14, className: "text-[var(--accent)]" })
              ) : null}
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Input - fixed at bottom on mobile */}
      <div className="fixed bottom-0 left-0 right-0 px-4 pb-4 pt-2 bg-[var(--bg-main)] z-10 md:static md:bg-transparent">
        <div className="w-full max-w-2xl mx-auto">
          <form onSubmit={handleSubmit}>
            <div className="bg-[var(--bg-elevated)] rounded-2xl border border-[var(--border)] p-3 md:p-4">
              {imagePreview && (
                <div className="relative mb-2 inline-block">
                  <img src={imagePreview} alt="Preview" className="max-h-32 rounded-lg border border-[var(--border)]" />
                  <button
                    type="button"
                    onClick={() => setImagePreview(null)}
                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-[var(--bg-surface)] border border-[var(--border)] flex items-center justify-center text-[var(--text-secondary)] hover:text-red-500 cursor-pointer"
                  ><X size={12} /></button>
                </div>
              )}
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={imagePreview ? "Опишите изображение..." : "Чем могу помочь?"}
                disabled={isLoading}
                className="w-full bg-transparent text-[var(--text-primary)] placeholder-[var(--text-muted)] resize-none outline-none text-base min-h-[40px]"
                rows={1}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
              />
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--text-secondary)] hover:bg-[var(--border)] hover:text-[var(--text-primary)] transition-all cursor-pointer"
                  >
                    <Plus size={18} />
                  </button>
                  <button
                    type="button"
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--text-secondary)] hover:bg-[var(--border)] hover:text-[var(--text-primary)] transition-all cursor-pointer"
                  >
                    <Mic size={18} />
                  </button>
                </div>
                <div className="flex items-center gap-1">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowModelDropdown(!showModelDropdown)}
                      className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] text-[var(--text-secondary)] hover:bg-[var(--border)] hover:text-[var(--text-primary)] transition-all cursor-pointer"
                    >
                      {modelName}
                      <ChevronDown size={10} />
                    </button>
                    {showModelDropdown && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowModelDropdown(false)} />
                        <div className="absolute bottom-full right-0 mb-1 w-44 bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl shadow-lg overflow-hidden z-50">
                          {modelOptions.map(({ name, minTier }) => {
                            const allowed = canUseModel(tier, minTier);
                            return (
                              <button
                                key={name}
                                type="button"
                                disabled={!allowed}
                                onClick={() => {
                                  if (!allowed) return;
                                  setModelName(name);
                                  setShowModelDropdown(false);
                                }}
                                className={`w-full px-3 py-2 text-left text-xs flex items-center gap-2 ${
                                  !allowed
                                    ? "text-[var(--text-muted)] cursor-not-allowed opacity-50"
                                    : modelName === name
                                    ? "bg-[var(--accent)]/10 text-[var(--accent)]"
                                    : "text-[var(--text-primary)] hover:bg-[var(--border)]"
                                }`}
                              >
                                {name}
                                {!allowed && <Lock size={10} className="ml-auto" />}
                              </button>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading || (!input.trim() && !imagePreview)}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--accent)] text-[var(--text-on-primary)] hover:bg-[var(--accent-hover)] transition-all disabled:opacity-30 cursor-pointer"
                  >
                    <Send size={14} />
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
