export default function RouteSkeleton() {
  return (
    <div className="animate-pulse space-y-4" aria-busy="true" aria-label="Loading">
      <div className="h-8 w-48 rounded-lg bg-slate-200 dark:bg-slate-700" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => <div key={i} className="h-24 rounded-2xl bg-slate-200 dark:bg-slate-700" />)}
      </div>
      <div className="h-56 rounded-2xl bg-slate-200 dark:bg-slate-700" />
      <div className="h-64 rounded-2xl bg-slate-200 dark:bg-slate-700" />
    </div>
  );
}
