import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { Activity, ArrowLeft, BadgeDollarSign, Clock3, LogIn, Search, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { fetchAdminSalesRepresentativeActivity } from "@/services/adminDashboardService";
import { formatCurrency } from "@/lib/utils";
import { PageLoader } from "@/components/PageLoader";

export function AdminStaffActivityTimelinePage() {
  const { repId = "" } = useParams();
  const [query, setQuery] = useState("");
  const [action, setAction] = useState("all");
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-sales-representative-activity", repId],
    queryFn: () => fetchAdminSalesRepresentativeActivity(repId),
    enabled: Boolean(repId),
    refetchInterval: 15000,
  });

  const events = data?.events || [];
  const actions = useMemo(() => Array.from(new Set(events.map((event) => event.action))).sort(), [events]);
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return events.filter((event) => {
      const matchesSearch = !term || [event.action, event.details || ""].some((value) => value.toLowerCase().includes(term));
      return matchesSearch && (action === "all" || event.action === action);
    });
  }, [action, events, query]);

  if (isLoading) return <PageLoader compact />;

  if (error || !data) {
    return <main className="app-container py-8"><Link to={`/admin/sales-representatives/${repId}`}><Button variant="outline"><ArrowLeft className="h-4 w-4" /> Staff Activity</Button></Link><Card className="mt-5"><CardContent><h1 className="text-xl font-black">Activity timeline unavailable</h1><p className="mt-2 text-sm font-semibold text-zinc-500">{error instanceof Error ? error.message : "This staff profile could not be found."}</p></CardContent></Card></main>;
  }

  const rep = data.representative;
  const todayStart = new Date().setHours(0, 0, 0, 0);
  const todayEvents = events.filter((event) => new Date(event.createdAt).getTime() >= todayStart).length;

  return (
    <main className="app-container py-6">
      <div>
        <Link to={`/admin/sales-representatives/${rep.id}`} className="inline-flex items-center gap-2 text-sm font-black text-savoury-primary"><ArrowLeft className="h-4 w-4" /> {rep.fullName}</Link>
        <p className="mt-5 text-xs font-black uppercase tracking-[0.2em] text-savoury-primary">Staff monitoring</p>
        <h1 className="mt-1 text-3xl font-black">Full Activity Timeline</h1>
        <p className="mt-1 text-sm font-semibold text-zinc-500">{rep.fullName} · {rep.staffId} · {rep.email}</p>
      </div>

      <section className="mt-6 grid gap-3 sm:grid-cols-3">
        <Metric icon={Activity} label="Tracked events" value={events.length.toString()} />
        <Metric icon={Clock3} label="Events today" value={todayEvents.toString()} />
        <Metric icon={BadgeDollarSign} label="Staff revenue" value={formatCurrency(data.totalRevenue)} />
      </section>

      <Card className="mt-5">
        <CardContent>
          <div className="grid gap-3 md:grid-cols-[1fr_240px]">
            <label className="flex h-12 items-center gap-3 rounded-xl border border-zinc-200 bg-white px-4 dark:border-white/10 dark:bg-zinc-950">
              <Search className="h-4 w-4 text-zinc-400" />
              <Input className="h-auto border-0 bg-transparent p-0 shadow-none dark:bg-transparent" placeholder="Search this staff member's activity" value={query} onChange={(event) => setQuery(event.target.value)} />
            </label>
            <select className="h-12 rounded-xl border border-zinc-200 bg-white px-4 text-sm font-bold dark:border-white/10 dark:bg-zinc-950" value={action} onChange={(event) => setAction(event.target.value)}>
              <option value="all">All actions</option>
              {actions.map((item) => <option key={item} value={item}>{displayAction(item)}</option>)}
            </select>
          </div>

          <div className="relative mt-6 grid gap-3 before:absolute before:bottom-5 before:left-5 before:top-5 before:w-px before:bg-zinc-200 dark:before:bg-white/10">
            {filtered.map((event) => (
              <article key={event.id} className="relative flex gap-4 rounded-xl border border-zinc-100 bg-zinc-50 p-4 dark:border-white/10 dark:bg-white/5">
                <span className="z-10 grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-savoury-primary text-white">{event.action === "signed_in" ? <LogIn className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}</span>
                <div className="min-w-0"><p className="font-black">{displayAction(event.action)}</p>{event.details && <p className="mt-1 text-sm font-semibold text-zinc-500">{event.details}</p>}<time className="mt-2 flex items-center gap-1 text-xs font-bold text-zinc-400"><Clock3 className="h-3 w-3" /> {new Date(event.createdAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</time></div>
              </article>
            ))}
            {!filtered.length && <div className="rounded-xl border border-dashed border-zinc-200 p-8 text-center text-sm font-semibold text-zinc-500 dark:border-white/10">No staff activity matches this filter.</div>}
          </div>
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
