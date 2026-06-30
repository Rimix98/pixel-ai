"use client";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-1 items-center justify-center bg-[var(--bg-main)]">
      <div className="flex flex-col items-center gap-4 text-center px-4">
        <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
          <span className="text-red-500 text-xl">!</span>
        </div>
        <h1 className="text-lg font-semibold text-[var(--text-primary)]">Ошибка</h1>
        <p className="text-sm text-[var(--text-secondary)] max-w-md">
          {error.message || "Что-то пошло не так. Попробуйте обновить страницу."}
        </p>
        <button
          onClick={() => reset()}
          className="px-4 py-2 rounded-lg bg-[var(--accent)] text-white text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer"
        >
          Попробовать снова
        </button>
      </div>
    </div>
  );
}
