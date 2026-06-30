"use client";

import { useState, useRef, useEffect, use } from "react";
import { Send, Bot, User, Copy, AlertTriangle, Mic, AudioLines, PenLine, GraduationCap, Coffee, ChevronDown, Image as ImageIcon, X, Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { MarkdownText } from "@/components/MarkdownText";
import { getGreetingTemplate, renderGreeting } from "@/lib/greeting";
import { canUseModel } from "@/lib/constants";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
  image?: string;
}

const modelOptions = [
  { name: "Aether 1.0", minTier: "max" },
  { name: "Ethos 1.0", minTier: "pro" },
  { name: "Logos 1.0", minTier: "free" },
];

export default function ChatConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationTitle, setConversationTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [modelName, setModelName] = useState("Logos 1.0");
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [greeting, setGreeting] = useState("");
  const [mounted, setMounted] = useState(false);
  const [isSmiling, setIsSmiling] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingAutoSubmit = useRef(false);
  const conversationNotFound = useRef(false);
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

  const handleMascotClick = () => {
    setIsSmiling(true);
    setTimeout(() => setIsSmiling(false), 5000);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchMessages = async () => {
    const res = await fetch(`/api/conversations/${id}`);
    if (res.ok) {
      const data = await res.json();
      setMessages(data);
      if (data.length > 0) {
        const firstUserMsg = data.find((m: Message) => m.role === "user");
        if (firstUserMsg) {
          setConversationTitle(firstUserMsg.content.slice(0, 50));
        }
      }
      return true;
    } else if (res.status === 401) {
      router.push("/login");
    } else if (res.status === 404) {
      conversationNotFound.current = true;
      router.push("/chat");
    }
    return false;
  };

  const checkPendingMessage = () => {
    const pending = sessionStorage.getItem("pendingMessage");
    const pendingImg = sessionStorage.getItem("pendingImage");
    if (pending) {
      sessionStorage.removeItem("pendingMessage");
      pendingAutoSubmit.current = true;
      setInput(pending);
    }
    if (pendingImg) {
      sessionStorage.removeItem("pendingImage");
      setImagePreview(pendingImg);
    }
  };

  useEffect(() => {
    (async () => {
      const ok = await fetchMessages();
      if (ok) checkPendingMessage();
    })();
  }, [id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setError("Изображение слишком большое (макс. 10 МБ)");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && !imagePreview) || isLoading) return;

    const userMessage: Message & { image?: string } = {
      id: crypto.randomUUID(),
      role: "user",
      content: input || "Проанализируй это изображение",
      created_at: new Date().toISOString(),
      ...(imagePreview ? { image: imagePreview } : {}),
    };

    setMessages((prev) => [...prev, userMessage as Message]);
    setInput("");
    const currentImage = imagePreview;
    setImagePreview(null);
    setIsLoading(true);
    setError(null);

    if (!conversationTitle) {
      setConversationTitle(input.slice(0, 50));
      fetch(`/api/conversations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: input.slice(0, 50) }),
      });
    }

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m: any) => ({
            role: m.role,
            content: m.content,
            ...(m.image ? { image: m.image } : {}),
          })),
          conversationId: id,
        }),
      });

      if (response.status === 429) {
        const data = await response.json();
        setError(data.error || "Лимит сообщений исчерпан");
        setMessages((prev) => prev.filter((m) => m.id !== userMessage.id));
        return;
      }

      if (response.status === 401) {
        router.push("/login");
        return;
      }

      if (response.status === 404) {
        setError("Чат не найден. Возможно, он был удалён.");
        setMessages((prev) => prev.filter((m) => m.id !== userMessage.id));
        return;
      }

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || errData.details || "Failed to get response");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";

      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "Секунду...",
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6).trim();
            if (data === "[DONE]") break;

            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                assistantContent += parsed.content;
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    ...updated[updated.length - 1],
                    content: assistantContent,
                  };
                  return updated;
                });
              }
            } catch {
              // skip
            }
          }
        }
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev.slice(0, -1),
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: err?.message || "Произошла ошибка. Попробуйте снова.",
          created_at: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleSubmitRef = useRef(handleSubmit);
  handleSubmitRef.current = handleSubmit;

  useEffect(() => {
    if (pendingAutoSubmit.current && (input.trim() || imagePreview) && !isLoading && !conversationNotFound.current) {
      pendingAutoSubmit.current = false;
      setTimeout(() => {
        handleSubmitRef.current({ preventDefault: () => {} } as React.FormEvent);
      }, 150);
    }
  }, [input, imagePreview, isLoading]);

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  const hasAssistantReply = messages.some((m) => m.role === "assistant");

  const tier = (user?.subscription_tier || "free") as string;
  const tierLabel = tier === "max" ? "Max" : tier === "pro" ? "Pro" : "Free";

  const inputBar = (
    <form onSubmit={handleSubmit}>
      <div className="bg-[var(--bg-elevated)] rounded-2xl border border-[var(--border)] p-3 md:p-4">
        {imagePreview && (
          <div className="relative mb-2 inline-block">
            <img
              src={imagePreview}
              alt="Preview"
              className="max-h-32 rounded-lg border border-[var(--border)]"
            />
            <button
              type="button"
              onClick={() => setImagePreview(null)}
              className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-[var(--bg-surface)] border border-[var(--border)] flex items-center justify-center text-[var(--text-secondary)] hover:text-red-500 transition-colors cursor-pointer"
            >
              <X size={12} />
            </button>
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
            title="Загрузить изображение (бета)"
          >
            +
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
          </div>
        </div>
      </div>
    </form>
  );

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
      <header className="flex items-center justify-between px-3 md:px-4 py-3 border-b border-[var(--bg-surface)]">
        <div className="flex items-center gap-2 md:gap-3">
          <h2 className="text-xs md:text-sm font-medium text-[var(--text-primary)] truncate max-w-[150px] md:max-w-[200px]">
            {conversationTitle || "Новый чат"}
          </h2>
        </div>
      </header>

      {error && (
        <div className="flex items-center gap-2 px-3 md:px-4 py-3 bg-[var(--warning-bg)] border-b border-[var(--warning-border)] text-[var(--warning-text)] text-xs md:text-sm">
          <AlertTriangle size={16} />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto opacity-50 hover:opacity-100 cursor-pointer"><X size={12} /></button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 md:space-y-6">
        {!hasAssistantReply && (
          <div className="flex flex-col items-center justify-center h-full text-center -mt-12 md:-mt-24">
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
              {inputBar}
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
                  }}
                  className="flex items-center gap-1.5 px-3 md:px-4 py-1.5 md:py-2 rounded-full bg-[var(--bg-surface)]/50 border border-[var(--border)] text-xs md:text-sm text-[var(--text-primary)] hover:bg-[var(--border)] transition-all cursor-pointer"
                >
                  <Icon size={14} className={color} />
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {hasAssistantReply && messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${
              message.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            {message.role === "assistant" && (
              <div className="flex-shrink-0 w-8 h-8 rounded-full overflow-hidden mt-1">
                <img src="/mascot.png" alt="AI" className="w-full h-full object-cover" />
              </div>
            )}

            <div
              className={`max-w-[75%] rounded-2xl px-4 py-3 group relative ${
                message.role === "user"
                  ? "bg-[var(--bg-primary-container)] text-[var(--text-primary)] rounded-tr-sm"
                  : "bg-[var(--bg-surface)] text-[var(--text-primary)] rounded-tl-sm border border-[var(--border)]"
              }`}
            >
              {(message as any).image && (
                <img
                  src={(message as any).image}
                  alt="Image"
                  className="max-w-full max-h-64 rounded-lg mb-2 border border-[var(--border)]"
                />
              )}
              <MarkdownText content={message.content} />
              {message.role === "assistant" && message.content && (
                <button
                  onClick={() => copyMessage(message.content)}
                  className="absolute -bottom-3 right-2 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)] shadow-sm transition-opacity cursor-pointer"
                >
                  <Copy size={12} className="text-[var(--text-secondary)]" />
                </button>
              )}
            </div>

            {message.role === "user" && (
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[var(--bg-primary-container)] flex items-center justify-center mt-1">
                <User size={16} className="text-[var(--accent)]" />
              </div>
            )}
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {hasAssistantReply && (
        <form
          onSubmit={handleSubmit}
          className="px-3 md:px-4 pb-3 md:pb-4"
        >
          <div className="max-w-3xl mx-auto bg-[var(--bg-elevated)] rounded-2xl border border-[var(--border)] p-3 md:p-4 mb-16 md:mb-0">
            {imagePreview && (
              <div className="relative mb-2 inline-block">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="max-h-32 rounded-lg border border-[var(--border)]"
                />
                <button
                  type="button"
                  onClick={() => setImagePreview(null)}
                  className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-[var(--bg-surface)] border border-[var(--border)] flex items-center justify-center text-[var(--text-secondary)] hover:text-red-500 transition-colors cursor-pointer"
                >
                  <X size={12} />
                </button>
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
                title="Загрузить изображение (бета)"
              >
                +
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
      )}
    </div>
  );
}
