export default function DashboardLoading() {
  return (
    <div className="flex flex-1 items-center justify-center bg-[var(--bg-main)]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-[var(--text-secondary)]">Загрузка...</p>
      </div>
    </div>
  );
}
