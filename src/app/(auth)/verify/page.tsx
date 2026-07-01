"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Sun, Moon, Send, ArrowLeft, LogIn } from "lucide-react";

export default function VerifyPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState(["", "", "", "", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isFromLogin, setIsFromLogin] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    setMounted(true);
    const params = new URLSearchParams(window.location.search);
    const vUserId = params.get("userId") || "";
    const vEmail = params.get("email") || "";
    const fromLogin = params.get("from") === "login";

    if (!vUserId || !vEmail) {
      router.push("/register");
      return;
    }

    setUserId(vUserId);
    setEmail(vEmail);
    setIsFromLogin(fromLogin);
  }, []);

  const handleCodeChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);
    setError("");
    if (value && index < 8) inputRefs.current[index + 1]?.focus();
    if (newCode.every((d) => d !== "") && index === 8) submitCode(newCode.join(""));
  };

  const handleCodeKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !code[index] && index > 0) inputRefs.current[index - 1]?.focus();
  };

  const handleCodePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 9);
    if (!pasted) return;
    const newCode = [...code];
    for (let i = 0; i < pasted.length; i++) newCode[i] = pasted[i];
    setCode(newCode);
    const nextEmpty = newCode.findIndex((d) => d === "");
    inputRefs.current[nextEmpty === -1 ? 8 : nextEmpty]?.focus();
    if (newCode.every((d) => d !== "")) submitCode(newCode.join(""));
  };

  const submitCode = async (codeStr: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, code: codeStr }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Неверный код");
        setCode(["", "", "", "", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
      } else {
        router.push("/onboarding");
      }
    } catch {
      setError("Ошибка сети");
    } finally {
      setLoading(false);
    }
  };

  const botUsername = process.env.NEXT_PUBLIC_TG_BOT || "PixelVerifyBot";
  const tgLink = userId
    ? `https://t.me/${botUsername}?start=${userId}`
    : "";

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
              <img src="/smileyMascot.png" alt="Pixel AI" className="w-10 h-10 rounded-full object-cover" />
            )}
            <h1 className="text-3xl font-bold text-[var(--text-primary)]">Pixel AI</h1>
          </div>
          <p className="text-[var(--text-secondary)]">
            {isFromLogin ? "Вход в аккаунт" : "Создайте аккаунт"}
          </p>
        </div>

        <h2 className="text-xl font-semibold text-center text-[var(--text-primary)] mb-2">Подтвердите почту</h2>
        <p className="text-center text-[var(--text-secondary)] text-sm mb-5">
          Напишите боту в Telegram, чтобы получить код
        </p>

        {tgLink && (
          <a
            href={tgLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-3 w-full py-4 px-4 mb-5 rounded-xl bg-[#229ED9]/15 border border-[#229ED9]/30 text-[#229ED9] hover:bg-[#229ED9]/25 transition-colors cursor-pointer"
          >
            <Send size={20} />
            <div className="text-left">
              <p className="font-medium text-sm">Открыть Telegram</p>
              <p className="text-xs opacity-70">@{botUsername}</p>
            </div>
          </a>
        )}

        <div className="mb-5 p-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)]">
          <p className="text-xs text-[var(--text-secondary)] text-center">
            1. Нажмите кнопку выше<br/>
            2. Отправьте боту <code className="text-[var(--accent)]">/start</code><br/>
            3. Бот пришлёт 9-значный код<br/>
            4. Введите его ниже
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            const joined = code.join("");
            if (joined.length === 9) submitCode(joined);
          }}
          className="flex flex-col gap-5"
        >
          <div className="flex justify-center gap-0">
            {code.map((digit, i) => (
              <div key={i} className="flex items-center">
                <input
                  ref={(el) => { inputRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleCodeChange(i, e.target.value)}
                  onKeyDown={(e) => handleCodeKeyDown(i, e)}
                  onPaste={i === 0 ? handleCodePaste : undefined}
                  autoFocus={i === 0}
                  disabled={loading}
                  className="w-10 h-12 text-center text-lg font-mono font-bold rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-primary)] outline-none focus:border-[var(--accent)] transition-colors disabled:opacity-50"
                />
                {(i === 2 || i === 5) && (
                  <span className="text-[var(--text-muted)] text-lg font-bold mx-0.5">-</span>
                )}
              </div>
            ))}
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-[var(--error-bg)] border border-[var(--error-border)] text-[var(--error-text)] text-sm text-center">
              {error}
            </div>
          )}

          {loading && (
            <div className="flex justify-center">
              <div className="w-5 h-5 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          <button
            type="submit"
            disabled={loading || code.some((d) => !d)}
            className="w-full py-3 px-4 rounded-xl bg-[var(--accent)] text-[var(--text-on-primary)] font-medium hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50 cursor-pointer"
          >
            {isFromLogin ? "Войти" : "Подтвердить"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[var(--text-secondary)]">
          {isFromLogin ? (
            <a href="/login" className="text-[var(--accent)] font-medium hover:underline cursor-pointer flex items-center justify-center gap-1">
              <LogIn size={14} />
              Назад к входу
            </a>
          ) : (
            <a href="/register" className="text-[var(--accent)] font-medium hover:underline cursor-pointer flex items-center justify-center gap-1">
              <ArrowLeft size={14} />
              Назад к регистрации
            </a>
          )}
        </p>
      </div>
    </div>
  );
}
