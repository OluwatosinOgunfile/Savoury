import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { Activity, ArrowLeft, Boxes, ChefHat, Clock3, LogIn, PackageCheck, Search, UserRound } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { fetchKitchenStaffActivity, type KitchenActivityLog } from "@/services/kitchenService";
import { PageLoader } from "@/components/PageLoader";

export function AdminKitchenStaffActivityPage() {
  const { staffId = "" } = useParams();
  const [query, setQuery] = useState("");
  const [source, setSource] = useState("all");
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-kitchen-staff-activity", staffId],
    queryFn: () => fetchKitchenStaffActivity(staffId),
    enabled: Boolean(staffId),
    refetchInterval: 15000,
  });

  const events = data?.events || [];
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return events.filter((event) => {
      const matchesSearch = !term || [event.action, event.orderNumber || "", event.fromStatus || "", event.toStatus || "", String(event.metadata?.food_name || "")].some((value) => value.toLowerCase().includes(term));
      return matchesSearch && (source === "all" || event.orderSource === source);
    });
  }, [events, query, source]);

  if (isLoading) return <PageLoader compact />;
  if (error || !data) return <main className="app-container py-8"><Link to="/admin"><Button variant="outline"><ArrowLeft className="h-4 w-4" /> Admin Dashboard</Button></Link><Card className="mt-5"><CardContent><h1 className="text-xl font-black">Kitchen activity unavailable</h1><p className="mt-2 text-sm font-semibold text-zinc-500">{error instanceof Error ? error.message : "This kitchen staff profile could not be found."}</p></CardContent></Card></main>;

  const staff = data.staff;
  const statusUpdates = events.filter((event) => event.action === "updated_order_status");
  const readyCount = events.filter((event) => event.toStatus === "ready").length;
  const uniqueOrders = new Set(events.map((event) => event.orderId).filter(Boolean)).size;

  return (
    <main className="app-container py-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div><Link to="/admin" className="inline-flex items-center gap-2 text-sm font-black text-savoury-primary"><ArrowLeft className="h-4 w-4" /> Admin Dashboard</Link><p className="mt-5 text-xs font-black uppercase tracking-[0.2em] text-savoury-primary">Kitchen staff activity</p><h1 className="mt-1 text-3xl font-black">{staff.fullName}</h1><p className="mt-1 text-sm font-semibold text-zinc-500">{staff.staffId} · {staff.email}</p></div>
        <span className={`w-fit rounded-full px-4 py-2 text-sm font-black capitalize ${staff.status === "active" ? "bg-savoury-primary/10 text-savoury-primary" : "bg-red-500/10 text-red-500"}`}>{staff.status}</span>
      </div>

      <section className="mt-6 grid gap-3 sm:grid-cols-3">
        <Metric icon={Activity} label="Status updates" value={statusUpdates.length.toString()} />
        <Metric icon={ChefHat} label="Orders handled" value={uniqueOrders.toString()} />
        <Metric icon={PackageCheck} label="Orders marked ready" value={readyCount.toString()} />
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[320px_1fr]">
        <Card><CardContent><div className="flex items-center gap-3"><UserRound className="h-5 w-5 text-savoury-primary" /><h2 className="text-lg font-black">Staff account</h2></div><div className="mt-4 grid gap-3 text-sm"><Detail label="Phone" value={staff.phone || "Not provided"} /><Detail label="Created" value={formatDate(staff.createdAt)} /><Detail label="Last login" value={staff.lastLoginAt ? formatDate(staff.lastLoginAt) : "No login recorded"} /><Detail label="Password" value={staff.mustChangePassword ? "Change required" : "Private password set"} /></div></CardContent></Card>

        <Card><CardContent>
          <div className="flex items-center gap-3"><Clock3 className="h-5 w-5 text-savoury-primary" /><h2 className="text-lg font-black">Activity timeline</h2></div>
          <div className="mt-4 grid gap-3 md:grid-cols-[1fr_200px]"><label className="flex h-12 items-center gap-3 rounded-xl border border-zinc-200 bg-white px-4 dark:border-white/10 dark:bg-zinc-950"><Search className="h-4 w-4 text-zinc-400" /><Input className="h-auto border-0 bg-transparent p-0 shadow-none dark:bg-transparent" placeholder="Search order or status" value={query} onChange={(event) => setQuery(event.target.value)} /></label><select className="h-12 rounded-xl border border-zinc-200 bg-white px-4 text-sm font-bold dark:border-white/10 dark:bg-zinc-950" value={source} onChange={(event) => setSource(event.target.value)}><option value="all">App and POS</option><option value="app">App orders</option><option value="pos">POS orders</option></select></div>
          <div className="mt-5 grid gap-3">{filtered.map((event) => <article key={event.id} className="flex gap-3 rounded-xl border border-zinc-100 bg-zinc-50 p-4 dark:border-white/10 dark:bg-white/5"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-savoury-primary/10 text-savoury-primary">{event.action === "signed_in" ? <LogIn className="h-4 w-4" /> : event.action === "adjusted_stock" ? <Boxes className="h-4 w-4" /> : <ChefHat className="h-4 w-4" />}</span><div><p className="font-black">{activityTitle(event)}</p>{activityDetails(event) && <p className="mt-1 text-sm font-semibold text-zinc-500">{activityDetails(event)}</p>}<p className="mt-1 text-xs font-bold text-zinc-400">{formatDate(event.createdAt)}</p></div></article>)}{!filtered.length && <div className="rounded-xl border border-dashed border-zinc-200 p-8 text-center text-sm font-semibold text-zinc-500 dark:border-white/10">No kitchen activity matches this filter.</div>}</div>
        </CardContent></Card>
      </section>
    </main>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof Activity; label: string; value: string }) { return <Card><CardContent><Icon className="h-5 w-5 text-savoury-primary" /><p className="mt-3 text-xs font-black uppercase text-zinc-500">{label}</p><p className="mt-1 text-2xl font-black">{value}</p></CardContent></Card>; }
function Detail({ label, value }: { label: string; value: string }) { return <div className="flex items-start justify-between gap-4 border-b border-zinc-100 pb-3 last:border-0 dark:border-white/10"><span className="font-semibold text-zinc-500">{label}</span><span className="text-right font-black">{value}</span></div>; }
function formatDate(value: string) { return new Date(value).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }); }
function activityTitle(event: KitchenActivityLog) {
  if (event.action === "signed_in") return "Signed in";
  if (event.action === "adjusted_stock") return `Updated ${String(event.metadata?.food_name || "food stock")}`;
  return `${event.fromStatus || "Order"} → ${event.toStatus || "Updated"}`;
}
function activityDetails(event: KitchenActivityLog) {
  if (event.action === "adjusted_stock") return `${String(event.metadata?.previous_quantity ?? 0)} → ${String(event.metadata?.new_quantity ?? 0)} · ${String(event.metadata?.reason || "Stock adjustment")}`;
  return event.orderNumber ? `${event.orderNumber} · ${event.orderSource?.toUpperCase()}` : "";
}
