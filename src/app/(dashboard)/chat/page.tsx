"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Plus, Mic, AudioLines, PenLine, GraduationCap, Coffee, ChevronDown, Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { getGreetingTemplate, renderGreeting } from "@/lib/greeting";

const modelOptions = [
  { name: "Aether 1.5", minTier: "max" },
  { name: "Ethos 4.1", minTier: "pro" },
  { name: "Logos 2.5", minTier: "free" },
];

const TIER_ORDER = ["free", "pro", "max"];

function canUseModel(tier: string, minTier: string) {
  return TIER_ORDER.indexOf(tier) >= TIER_ORDER.indexOf(minTier);
}

export default function ChatPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [greeting, setGreeting] = useState("");
  const [mounted, setMounted] = useState(false);
  const [isSmiling, setIsSmiling] = useState(false);
  const [modelName, setModelName] = useState("Logos 2.5");
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const greetingTemplateRef = useRef("");
  useEffect(() => {
    const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
    greetingTemplateRef.current = getGreetingTemplate(isMobile);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (greetingTemplateRef.current) {
      setGreeting(renderGreeting(greetingTemplateRef.current, user?.full_name));
    }
  }, [user]);


  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) return;
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleMascotClick = () => {
    setIsSmiling(true);
    setTimeout(() => setIsSmiling(false), 5000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && !imagePreview) || isLoading) return;

    setIsLoading(true);

    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: (input || "Анализ изображения").slice(0, 50) }),
      });

      if (res.ok) {
        const conv = await res.json();
        const convId = conv?.id;
        if (!convId) throw new Error("No conversation ID");

        if (input.trim()) sessionStorage.setItem("pendingMessage", input.trim());
        if (imagePreview) sessionStorage.setItem("pendingImage", imagePreview);

        window.location.href = `/chat/${convId}`;
        return;
      }
    } catch {
      // fallback
    }
    setIsLoading(false);
  };

  const tier = user?.subscription_tier || "free";
  const tierLabel = tier === "max" ? "Max" : tier === "pro" ? "Pro" : "Free";

  return (
    <div className="flex flex-col h-full bg-[var(--bg-main)]">
      {tier !== "max" && (
        <div className="flex items-center justify-center gap-2 px-4 py-1.5 bg-[var(--accent)]/10 border-b border-[var(--accent)]/20 text-xs text-[var(--text-primary)]">
          <span className="font-medium">{tierLabel} план активирован</span>
          <Link
            href="/pricing"
            className="underline underline-offset-2 text-[var(--accent)] hover:opacity-80 transition-opacity"
          >
            Обновиться
          </Link>
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
      <div className="flex-1 flex flex-col items-center justify-center text-center px-4 pb-16 md:pb-0">
        <div className="flex items-center justify-center gap-3 mb-6">
          <img
            src={isSmiling ? "/smileyMascot.png" : "/mascot.png"}
            alt="Pixel AI"
            className="w-10 h-10 rounded-full object-cover cursor-pointer hover:scale-105 transition-transform"
            onClick={handleMascotClick}
            suppressHydrationWarning
          />
          <h1 className="text-2xl md:text-4xl font-light text-[var(--text-primary)]">{mounted ? greeting : "\u00A0"}</h1>
        </div>

        <div className="w-full max-w-2xl mb-4">
          <form onSubmit={handleSubmit}>
            <div className="bg-[var(--bg-elevated)] rounded-2xl border border-[var(--border)] p-3 md:p-4">
              {imagePreview && (
                <div className="relative mb-2 inline-block">
                  <img src={imagePreview} alt="Preview" className="max-h-32 rounded-lg border border-[var(--border)]" />
                  <button
                    type="button"
                    onClick={() => setImagePreview(null)}
                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-[var(--bg-surface)] border border-[var(--border)] flex items-center justify-center text-[var(--text-secondary)] hover:text-red-500 transition-colors cursor-pointer"
                  >✕</button>
                </div>
              )}
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={imagePreview ? "Опишите изображение..." : "Чем могу помочь?"}
                disabled={isLoading}
                className="w-full bg-transparent text-[var(--text-primary)] placeholder-[var(--text-muted)] resize-none outline-none text-base md:text-lg min-h-[40px] md:min-h-[50px]"
                rows={1}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
              />
              <div className="flex items-center justify-between mt-2 md:mt-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--text-secondary)] hover:bg-[var(--border)] hover:text-[var(--text-primary)] transition-all cursor-pointer"
                >
                  <Plus size={20} />
                </button>
                <div className="flex items-center gap-1 md:gap-2">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowModelDropdown(!showModelDropdown)}
                      className="flex items-center gap-1 md:gap-1.5 px-2 md:px-3 py-1.5 rounded-lg text-[10px] md:text-xs text-[var(--text-secondary)] hover:bg-[var(--border)] hover:text-[var(--text-primary)] transition-all cursor-pointer"
                    >
                      {modelName}
                      <ChevronDown size={12} />
                    </button>
                    {showModelDropdown && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowModelDropdown(false)} />
                        <div className="absolute bottom-full right-0 mb-1 w-48 bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl shadow-lg overflow-hidden z-50">
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
                                className={`w-full px-4 py-2.5 text-left text-xs flex items-center gap-2 transition-colors ${
                                  !allowed
                                    ? "text-[var(--text-muted)] cursor-not-allowed opacity-50"
                                    : modelName === name
                                    ? "bg-[var(--accent)]/10 text-[var(--accent)] cursor-pointer"
                                    : "text-[var(--text-primary)] hover:bg-[var(--border)] cursor-pointer"
                                }`}
                              >
                                {name}
                                {!allowed && <Lock size={12} className="ml-auto" />}
                              </button>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                  <button
                    type="button"
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--text-secondary)] hover:bg-[var(--border)] hover:text-[var(--text-primary)] transition-all cursor-pointer"
                  >
                    <Mic size={20} />
                  </button>
                  <button
                    type="button"
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--text-secondary)] hover:bg-[var(--border)] hover:text-[var(--text-primary)] transition-all cursor-pointer"
                  >
                    <AudioLines size={20} />
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading || !input.trim()}
                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-[var(--accent)] text-[var(--text-on-primary)] hover:bg-[var(--accent-hover)] transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <Send size={16} />
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>

        <div className="flex flex-wrap gap-2 justify-center">
          {[
            { icon: PenLine, label: "Написать", color: "text-purple-400" },
            { icon: GraduationCap, label: "Учиться", color: "text-blue-400" },
            { icon: Coffee, label: "Бытовое", color: "text-orange-400" },
          ].map(({ icon: Icon, label, color }) => (
            <button
              key={label}
              onClick={() => {
                const prompts: Record<string, string> = {
                  Написать: "Напиши мне эссе на тему",
                  Учиться: "Объясни мне концепцию",
                  "Бытовое": "Помоги мне с",
                };
                setInput(prompts[label] || "");
                inputRef.current?.focus();
              }}
              className="flex items-center gap-1.5 px-3 md:px-4 py-1.5 md:py-2 rounded-full bg-[var(--bg-surface)]/50 border border-[var(--border)] text-xs md:text-sm text-[var(--text-primary)] hover:bg-[var(--border)] transition-all cursor-pointer"
            >
              <Icon size={14} className={color} />
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
