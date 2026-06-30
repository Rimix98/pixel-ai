import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-1 items-center justify-center bg-[var(--bg-main)]">
      <div className="flex flex-col items-center gap-4 text-center px-4">
        <h1 className="text-6xl font-bold text-[var(--text-muted)]">404</h1>
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Страница не найдена</h2>
        <p className="text-sm text-[var(--text-secondary)]">
          Запрашиваемая страница не существует или была перемещена.
        </p>
        <Link
          href="/chat"
          className="px-4 py-2 rounded-lg bg-[var(--accent)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Перейти в чат
        </Link>
      </div>
    </div>
  );
}
