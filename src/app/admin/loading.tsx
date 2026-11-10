/** Instant feedback while an admin page loads (the menu stays in place). */
export default function AdminLoading() {
  return (
    <div className="mx-auto max-w-6xl animate-pulse space-y-4" aria-busy="true" aria-label="טוען">
      <div className="h-7 w-48 rounded-lg bg-line/70" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="card h-24 bg-white" />
        ))}
      </div>
      <div className="card space-y-3 p-4">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="h-12 w-16 rounded-lg bg-line/60" />
            <div className="flex-1 space-y-2">
              <div className="h-3.5 w-2/5 rounded bg-line/70" />
              <div className="h-3 w-3/5 rounded bg-line/50" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
