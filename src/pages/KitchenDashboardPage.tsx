import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChefHat, Clock3, LogOut, MonitorCheck, RefreshCw, UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { useAuth } from "@/hooks/useAuth";
import { fetchKitchenOrders, updateKitchenOrderStatus, type KitchenOrder, type KitchenOrderStatus } from "@/services/kitchenService";

const stages: Array<{ id: KitchenOrderStatus; title: string; subtitle: string }> = [
  { id: "received", title: "Received", subtitle: "Waiting to be started" },
  { id: "preparing", title: "Preparing", subtitle: "Currently in the kitchen" },
  { id: "ready", title: "Ready", subtitle: "Waiting for service or dispatch" },
  { id: "out_for_delivery", title: "Out for delivery", subtitle: "Dispatched and awaiting confirmation" },
];

export function KitchenDashboardPage() {
  const { profile, signOut } = useAuth();
  const queryClient = useQueryClient();
  const [now, setNow] = useState(Date.now());
  const [message, setMessage] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);
  const { data: orders = [], isLoading, error, refetch } = useQuery({ queryKey: ["kitchen-orders"], queryFn: fetchKitchenOrders, refetchInterval: 10000 });

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  const counts = useMemo(() => Object.fromEntries(stages.map((stage) => [stage.id, orders.filter((order) => order.status === stage.id).length])), [orders]);
  const moveOrder = async (order: KitchenOrder, status: "preparing" | "ready" | "out_for_delivery") => {
    setUpdating(order.id);
    setMessage("");
    try {
      await updateKitchenOrderStatus(order, status);
      await queryClient.invalidateQueries({ queryKey: ["kitchen-orders"] });
      setMessage(`${order.number} moved to ${status}.`);
    } catch (updateError) {
      setMessage(updateError instanceof Error ? updateError.message : "Could not update the order.");
    } finally {
      setUpdating(null);
    }
  };

  return (
    <main className="min-h-screen bg-zinc-50 pb-20 dark:bg-[#0d0d0d]">
      <section className="border-b border-zinc-200 bg-white px-4 py-4 dark:border-white/10 dark:bg-[#151515]">
        <div className="mx-auto flex max-w-[1500px] flex-col justify-between gap-4 md:flex-row md:items-center">
          <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-savoury-primary text-white"><ChefHat className="h-6 w-6" /></span><div><p className="text-xs font-black uppercase tracking-[0.2em] text-savoury-primary">Kitchen operations</p><h1 className="text-2xl font-black">Preparation Queue</h1><p className="text-sm font-semibold text-zinc-500">{profile?.fullName} · {new Date(now).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</p></div></div>
          <div className="flex gap-2"><Button variant="outline" onClick={() => refetch()}><RefreshCw className="h-4 w-4" /> Refresh</Button><Button variant="outline" onClick={signOut}><LogOut className="h-4 w-4" /> Sign out</Button></div>
        </div>
      </section>

      <div className="mx-auto max-w-[1500px] px-4 py-5">
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {stages.map((stage) => <Card key={stage.id}><CardContent className="flex items-center justify-between"><div><p className="text-xs font-black uppercase text-zinc-500">{stage.title}</p><p className="mt-1 text-3xl font-black">{counts[stage.id] || 0}</p></div><MonitorCheck className="h-7 w-7 text-savoury-primary" /></CardContent></Card>)}
        </section>
        {message && <p className="mt-4 rounded-xl border border-savoury-primary/20 bg-savoury-primary/10 px-4 py-3 text-sm font-black text-savoury-primary">{message}</p>}
        {error && <p className="mt-4 rounded-xl bg-red-500/10 px-4 py-3 text-sm font-black text-red-500">{error instanceof Error ? error.message : "Could not load kitchen orders."}</p>}

        <section className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {stages.map((stage) => (
            <div key={stage.id} className="min-w-0 rounded-2xl border border-zinc-200 bg-zinc-100/70 p-3 dark:border-white/10 dark:bg-white/[0.03]">
              <div className="flex items-end justify-between px-1 pb-3"><div><h2 className="text-lg font-black">{stage.title}</h2><p className="text-xs font-semibold text-zinc-500">{stage.subtitle}</p></div><span className="rounded-full bg-white px-3 py-1 text-xs font-black dark:bg-white/10">{counts[stage.id] || 0}</span></div>
              <div className="grid gap-3">
                {orders.filter((order) => order.status === stage.id).map((order) => <KitchenTicket key={`${order.source}-${order.id}`} order={order} now={now} updating={updating === order.id} onMove={moveOrder} />)}
                {!isLoading && !orders.some((order) => order.status === stage.id) && <div className="rounded-xl border border-dashed border-zinc-300 p-8 text-center text-sm font-semibold text-zinc-500 dark:border-white/10">No orders here.</div>}
              </div>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}

function KitchenTicket({ order, now, updating, onMove }: { order: KitchenOrder; now: number; updating: boolean; onMove: (order: KitchenOrder, status: "preparing" | "ready" | "out_for_delivery") => void }) {
  return (
    <Card className="border-zinc-200 shadow-sm dark:border-white/10">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-black">{order.number}</h3><span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${order.source === "pos" ? "bg-blue-500/10 text-blue-500" : "bg-savoury-primary/10 text-savoury-primary"}`}>{order.source}</span></div><p className="mt-1 text-xs font-semibold text-zinc-500">{order.customerName} · {order.orderType.replace(/_/g, " ")}</p></div><span className="flex items-center gap-1 text-xs font-black text-zinc-500"><Clock3 className="h-3 w-3" /> {elapsed(order.createdAt, now)}</span></div>
        <div className="my-4 h-px bg-zinc-100 dark:bg-white/10" />
        <div className="grid gap-2">{order.items.map((item, index) => <div key={`${item.name}-${index}`} className="flex items-center gap-3"><span className="grid h-7 min-w-7 place-items-center rounded-lg bg-savoury-primary text-xs font-black text-white">{item.quantity}</span><span className="text-sm font-black">{item.name}</span></div>)}</div>
        {order.address && <p className="mt-3 rounded-xl bg-blue-500/10 p-3 text-xs font-bold text-blue-600 dark:text-blue-300">Deliver to: {order.address}</p>}
        {order.instructions && <div className="mt-4 rounded-xl bg-amber-500/10 p-3 text-xs font-bold text-amber-700 dark:text-amber-400"><UtensilsCrossed className="mr-1 inline h-3 w-3" /> {order.instructions}</div>}
        {order.status === "received" && <Button className="mt-4 w-full" disabled={updating} onClick={() => onMove(order, "preparing")}>{updating ? "Updating..." : "Start preparing"}</Button>}
        {order.status === "preparing" && <Button className="mt-4 w-full" disabled={updating} onClick={() => onMove(order, "ready")}>{updating ? "Updating..." : "Mark ready"}</Button>}
        {order.status === "ready" && order.orderType === "delivery" && <Button className="mt-4 w-full" disabled={updating} onClick={() => onMove(order, "out_for_delivery")}>{updating ? "Updating..." : "Send out for delivery"}</Button>}
        {order.status === "ready" && order.orderType !== "delivery" && <p className="mt-4 rounded-xl bg-savoury-primary/10 px-3 py-2 text-center text-xs font-black text-savoury-primary">Ready for counter handover</p>}
        {order.status === "out_for_delivery" && <p className="mt-4 rounded-xl bg-savoury-primary/10 px-3 py-2 text-center text-xs font-black text-savoury-primary">Awaiting delivery confirmation</p>}
      </CardContent>
    </Card>
  );
}

function elapsed(createdAt: string, now: number) {
  const minutes = Math.max(0, Math.floor((now - new Date(createdAt).getTime()) / 60000));
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}
