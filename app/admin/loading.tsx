/**
 * Streaming boundary for every /admin route. The App Router shows this the
 * instant a sidebar tab is clicked (and prefetches it along with the route),
 * so navigation paints immediately while the dynamic page renders on the
 * server. Colors are slate utilities → auto-remapped by the admin dark theme.
 */
export default function AdminLoading() {
  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-pulse" aria-busy>
      <div className="space-y-2.5">
        <div className="h-7 w-44 rounded-lg bg-slate-200" />
        <div className="h-4 w-72 rounded-md bg-slate-100" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="h-36 rounded-2xl border border-slate-200 bg-slate-100" />
        <div className="h-36 rounded-2xl border border-slate-200 bg-slate-100" />
        <div className="h-36 rounded-2xl border border-slate-200 bg-slate-100 hidden lg:block" />
      </div>
      <div className="h-96 rounded-2xl border border-slate-200 bg-slate-100" />
    </div>
  );
}
