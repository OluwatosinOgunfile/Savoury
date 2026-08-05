import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Activity, ArrowLeft, CalendarDays, Clock3, Search, Users } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { fetchAdminActivityEvents } from "@/services/adminDashboardService";

const pageSize = 50;

export function AdminActivityPage() {
  const [query, setQuery] = useState("");
  const [action, setAction] = useState("all");
  const [page, setPage] = useState("all");
  const [visibleCount, setVisibleCount] = useState(pageSize);
  const { data: events = [], isLoading, error } = useQuery({
    queryKey: ["admin-activity-events", "full"],
    queryFn: () => fetchAdminActivityEvents(250),
    refetchInterval: 15000,
  });

  const actions = useMemo(() => Array.from(new Set(events.map((event) => event.action))).sort(), [events]);
  const pages = useMemo(() => Array.from(new Set(events.map((event) => event.page).filter(Boolean) as string[])).sort(), [events]);
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return events.filter((event) => {
      const matchesSearch = !term || [event.user, event.action, event.page || ""].some((value) => value.toLowerCase().includes(term));
      return matchesSearch && (action === "all" || event.action === action) && (page === "all" || event.page === page);
    });
  }, [action, events, page, query]);

  const todayStart = new Date().setHours(0, 0, 0, 0);
  const todayEvents = events.filter((event) => new Date(event.createdAt).getTime() >= todayStart).length;
  const uniqueUsers = new Set(events.map((event) => event.user)).size;

  return (
    <main className="app-container py-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <Link to="/admin" className="inline-flex items-center gap-2 text-sm font-black text-savoury-primary"><ArrowLeft className="h-4 w-4" /> Admin Dashboard</Link>
          <p className="mt-5 text-xs font-black uppercase tracking-[0.2em] text-savoury-primary">Admin monitoring</p>
          <h1 className="mt-1 text-3xl font-black">Activity Timeline</h1>
          <p className="mt-1 text-sm font-semibold text-zinc-500">Review customer and staff actions recorded across the platform.</p>
        </div>
      </div>

      <section className="mt-6 grid gap-3 sm:grid-cols-3">
        <Metric icon={Activity} label="Tracked events" value={events.length.toString()} />
        <Metric icon={CalendarDays} label="Events today" value={todayEvents.toString()} />
        <Metric icon={Users} label="Active identities" value={uniqueUsers.toString()} />
      </section>

      <Card className="mt-5">
        <CardContent>
          <div className="grid gap-3 lg:grid-cols-[1fr_220px_220px]">
            <label className="flex h-12 items-center gap-3 rounded-xl border border-zinc-200 bg-white px-4 dark:border-white/10 dark:bg-zinc-950">
              <Search className="h-4 w-4 text-zinc-400" />
              <Input className="h-auto border-0 bg-transparent p-0 shadow-none dark:bg-transparent" placeholder="Search people, actions, or pages" value={query} onChange={(event) => { setQuery(event.target.value); setVisibleCount(pageSize); }} />
            </label>
            <select className="h-12 rounded-xl border border-zinc-200 bg-white px-4 text-sm font-bold dark:border-white/10 dark:bg-zinc-950" value={action} onChange={(event) => { setAction(event.target.value); setVisibleCount(pageSize); }}>
              <option value="all">All actions</option>
              {actions.map((item) => <option key={item} value={item}>{displayAction(item)}</option>)}
            </select>
            <select className="h-12 rounded-xl border border-zinc-200 bg-white px-4 text-sm font-bold dark:border-white/10 dark:bg-zinc-950" value={page} onChange={(event) => { setPage(event.target.value); setVisibleCount(pageSize); }}>
              <option value="all">All pages</option>
              {pages.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>

          {error && <p className="mt-4 rounded-xl bg-red-500/10 px-4 py-3 text-sm font-black text-red-500">{error instanceof Error ? error.message : "Could not load activity."}</p>}
          <div className="mt-5 grid gap-3">
            {filtered.slice(0, visibleCount).map((event) => (
              <article key={event.id} className="flex flex-col justify-between gap-3 rounded-xl border border-zinc-100 bg-zinc-50 p-4 dark:border-white/10 dark:bg-white/5 sm:flex-row sm:items-center">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-savoury-primary/10 text-savoury-primary"><Activity className="h-5 w-5" /></span>
                  <div className="min-w-0"><p className="font-black">{event.user}</p><p className="mt-1 text-sm font-semibold text-zinc-500">{displayAction(event.action)}{event.page ? ` on ${event.page}` : ""}</p></div>
                </div>
                <time className="flex shrink-0 items-center gap-2 text-xs font-bold text-zinc-500"><Clock3 className="h-4 w-4" /> {new Date(event.createdAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</time>
              </article>
            ))}
            {!isLoading && !filtered.length && <div className="rounded-xl border border-dashed border-zinc-200 p-8 text-center text-sm font-semibold text-zinc-500 dark:border-white/10">No activity matches the selected filters.</div>}
            {isLoading && <div className="grid place-items-center p-10"><div className="h-9 w-9 animate-spin rounded-full border-2 border-savoury-primary border-t-transparent" /></div>}
          </div>
          {visibleCount < filtered.length && <Button className="mt-5 w-full" variant="outline" onClick={() => setVisibleCount((count) => count + pageSize)}>Load More Activity</Button>}
        </CardContent>
      </Card>
    </main>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof Activity; label: string; value: string }) {
  return <Card><CardContent><Icon className="h-5 w-5 text-savoury-primary" /><p className="mt-3 text-xs font-black uppercase text-zinc-500">{label}</p><p className="mt-1 text-2xl font-black">{value}</p></CardContent></Card>;
}

function displayAction(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
