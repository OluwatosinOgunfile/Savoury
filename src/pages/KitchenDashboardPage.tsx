import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BellRing, Boxes, ChefHat, Clock3, History, LogOut, MonitorCheck, PackagePlus, PackageX, Search, UtensilsCrossed, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/hooks/useAuth";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { adjustKitchenStock, fetchKitchenOrders, fetchKitchenStock, fetchKitchenStockAdjustments, updateKitchenOrderStatus, type KitchenOrder, type KitchenOrderStatus, type KitchenStockAdjustment, type KitchenStockItem } from "@/services/kitchenService";
import { playAlertTone, primeAlertAudio } from "@/services/alertSound";

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
  const [activeView, setActiveView] = useState<"orders" | "stock">("orders");
  const [updatingStock, setUpdatingStock] = useState<string | null>(null);
  const [orderSoundEnabled, setOrderSoundEnabled] = useState(() => localStorage.getItem("savoury-kitchen-order-sound") !== "false");
  const [alertsSetupComplete, setAlertsSetupComplete] = useState(() => localStorage.getItem("savoury-kitchen-alerts-setup") === "true");
  const [audioReady, setAudioReady] = useState(false);
  const pendingOrderTone = useRef(false);
  const knownOrderIds = useRef(new Set<string>());
  const ordersInitialized = useRef(false);
  const dashboardOpenedAt = useRef(Date.now());
  const { data: orders = [], isLoading, isFetched, error } = useQuery({ queryKey: ["kitchen-orders"], queryFn: fetchKitchenOrders, refetchInterval: 5000 });
  const { data: stock = [], error: stockError } = useQuery({ queryKey: ["kitchen-stock"], queryFn: fetchKitchenStock, enabled: activeView === "stock", refetchInterval: 10000 });
  const { data: stockAdjustments = [] } = useQuery({ queryKey: ["kitchen-stock-adjustments"], queryFn: fetchKitchenStockAdjustments, enabled: activeView === "stock", refetchInterval: 15000 });

  const unlockOrderSound = useCallback(async () => {
    if (!orderSoundEnabled) return false;
    try {
      const ready = await primeAlertAudio();
      setAudioReady(ready);
      if (ready) {
        setAlertsSetupComplete(true);
        localStorage.setItem("savoury-kitchen-alerts-setup", "true");
      }
      return ready;
    } catch {
      setAudioReady(false);
      return false;
    }
  }, [orderSoundEnabled]);

  const playOrderTone = useCallback(async () => {
    if (!orderSoundEnabled) return false;
    try {
      const unlocked = await unlockOrderSound();
      if (!unlocked) {
        pendingOrderTone.current = true;
        return false;
      }
      const played = await playAlertTone({ volume: 0.7, frequencies: [659, 880] });
      if (!played) {
        pendingOrderTone.current = true;
        return false;
      }
      pendingOrderTone.current = false;
      return true;
    } catch {
      pendingOrderTone.current = true;
      setAudioReady(false);
      return false;
    }
  }, [orderSoundEnabled, unlockOrderSound]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!orderSoundEnabled) return;
    const unlock = async () => {
      const ready = await unlockOrderSound();
      if (ready && pendingOrderTone.current) void playOrderTone();
    };
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, [orderSoundEnabled, playOrderTone, unlockOrderSound]);

  useEffect(() => {
    if (!isFetched) return;
    const currentIds = new Set(orders.map((order) => `${order.source}-${order.id}`));
    if (!ordersInitialized.current) {
      ordersInitialized.current = true;
      knownOrderIds.current = currentIds;
      const justReceived = orders.filter((order) => new Date(order.createdAt).getTime() >= dashboardOpenedAt.current - 2000);
      if (justReceived.length) {
        const latest = justReceived[justReceived.length - 1];
        setMessage(`New ${latest.source.toUpperCase()} order ${latest.number} received.`);
        void playOrderTone();
      }
      return;
    }

    const newOrders = orders.filter((order) => !knownOrderIds.current.has(`${order.source}-${order.id}`));
    currentIds.forEach((id) => knownOrderIds.current.add(id));
    if (newOrders.length) {
      const latest = newOrders[newOrders.length - 1];
      setMessage(newOrders.length === 1 ? `New ${latest.source.toUpperCase()} order ${latest.number} received.` : `${newOrders.length} new orders received.`);
      void playOrderTone();
    }
  }, [isFetched, orders, playOrderTone]);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase || !profile?.id) return;
    const client = supabase;
    const announceRealtimeOrder = (source: "app" | "pos", payload: { new: Record<string, unknown> }) => {
      const id = String(payload.new.id || "");
      if (!id) return;
      const key = `${source}-${id}`;
      if (!knownOrderIds.current.has(key)) {
        knownOrderIds.current.add(key);
        const number = source === "pos" ? String(payload.new.receipt_number || "new POS order") : `APP-${id.slice(0, 8).toUpperCase()}`;
        setMessage(`New ${source.toUpperCase()} order ${number} received.`);
        void playOrderTone();
      }
      void queryClient.invalidateQueries({ queryKey: ["kitchen-orders"] });
    };
    const channel = client
      .channel(`kitchen-new-orders-${profile.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders" }, (payload) => announceRealtimeOrder("app", payload))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "pos_orders" }, (payload) => announceRealtimeOrder("pos", payload))
      .subscribe();
    return () => {
      void client.removeChannel(channel);
    };
  }, [playOrderTone, profile?.id, queryClient]);

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

  const updateStock = async (item: KitchenStockItem, input: { quantityChange?: number; reason: string; available?: boolean }) => {
    setUpdatingStock(item.id);
    try {
      await adjustKitchenStock({ foodId: item.id, ...input });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["kitchen-stock"] }),
        queryClient.invalidateQueries({ queryKey: ["kitchen-stock-adjustments"] }),
        queryClient.invalidateQueries({ queryKey: ["foods"] }),
      ]);
      setMessage(`${item.name} stock updated successfully.`);
    } catch (stockUpdateError) {
      setMessage(stockUpdateError instanceof Error ? stockUpdateError.message : "Could not update food stock.");
    } finally {
      setUpdatingStock(null);
    }
  };

  return (
    <main className="min-h-screen bg-zinc-50 pb-20 dark:bg-[#0d0d0d]">
      <section className="border-b border-zinc-200 bg-white px-4 py-4 dark:border-white/10 dark:bg-[#151515]">
        <div className="mx-auto flex max-w-[1500px] flex-col justify-between gap-4 md:flex-row md:items-center">
          <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-savoury-primary text-white"><ChefHat className="h-6 w-6" /></span><div><p className="text-xs font-black uppercase tracking-[0.2em] text-savoury-primary">Kitchen operations</p><h1 className="text-2xl font-black">Preparation Queue</h1><p className="text-sm font-semibold text-zinc-500">{profile?.fullName} · {new Date(now).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</p></div></div>
          <div className="flex flex-wrap gap-2">
            {!orderSoundEnabled && <Button variant="outline" onClick={() => { setOrderSoundEnabled(true); localStorage.setItem("savoury-kitchen-order-sound", "true"); void primeAlertAudio().then(setAudioReady); setMessage("New-order sound enabled."); }}><VolumeX className="h-4 w-4" /> Sound off</Button>}
            {orderSoundEnabled && !alertsSetupComplete && <Button onClick={async () => { const ready = await unlockOrderSound(); if (ready) { await playOrderTone(); setMessage("Kitchen order alerts are enabled on this device."); } else { setMessage("The browser blocked audio. Check this tab's sound permission."); } }}><BellRing className="h-4 w-4" /> Enable order alerts</Button>}
            {orderSoundEnabled && alertsSetupComplete && <Button variant="outline" onClick={() => { setOrderSoundEnabled(false); setAudioReady(false); localStorage.setItem("savoury-kitchen-order-sound", "false"); setMessage("New-order sound muted."); }}><Volume2 className="h-4 w-4" /> Sound on</Button>}
            {orderSoundEnabled && audioReady && <Button variant="outline" onClick={() => { void playOrderTone(); setMessage("Playing the kitchen order test chime."); }}><BellRing className="h-4 w-4" /> Test chime</Button>}
            <Button variant="outline" onClick={signOut}><LogOut className="h-4 w-4" /> Sign out</Button>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1500px] px-4 py-5">
        <div className="mb-5 inline-flex rounded-xl border border-zinc-200 bg-white p-1 shadow-sm dark:border-white/10 dark:bg-[#171717]">
          <button onClick={() => setActiveView("orders")} className={`flex h-11 items-center gap-2 rounded-lg px-4 text-sm font-black transition ${activeView === "orders" ? "bg-savoury-primary text-white" : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-white/10"}`}><ChefHat className="h-4 w-4" /> Order Queue</button>
          <button onClick={() => setActiveView("stock")} className={`flex h-11 items-center gap-2 rounded-lg px-4 text-sm font-black transition ${activeView === "stock" ? "bg-savoury-primary text-white" : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-white/10"}`}><Boxes className="h-4 w-4" /> Stock</button>
        </div>
        {message && <p className="mb-4 rounded-xl border border-savoury-primary/20 bg-savoury-primary/10 px-4 py-3 text-sm font-black text-savoury-primary">{message}</p>}

        {activeView === "orders" && <><section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {stages.map((stage) => <Card key={stage.id}><CardContent className="flex items-center justify-between"><div><p className="text-xs font-black uppercase text-zinc-500">{stage.title}</p><p className="mt-1 text-3xl font-black">{counts[stage.id] || 0}</p></div><MonitorCheck className="h-7 w-7 text-savoury-primary" /></CardContent></Card>)}
        </section>
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
        </>}

        {activeView === "stock" && <KitchenStockPanel items={stock} adjustments={stockAdjustments} updatingId={updatingStock} error={stockError} onUpdate={updateStock} />}
      </div>
    </main>
  );
}

function KitchenStockPanel({ items, adjustments, updatingId, error, onUpdate }: { items: KitchenStockItem[]; adjustments: KitchenStockAdjustment[]; updatingId: string | null; error: unknown; onUpdate: (item: KitchenStockItem, input: { quantityChange?: number; reason: string; available?: boolean }) => Promise<void> }) {
  const [query, setQuery] = useState("");
  const filtered = items.filter((item) => [item.name, item.category].join(" ").toLowerCase().includes(query.trim().toLowerCase()));
  const lowStock = items.filter((item) => item.stockQuantity > 0 && item.stockQuantity <= 5).length;
  const unavailable = items.filter((item) => !item.isAvailable || item.stockQuantity === 0).length;

  return (
    <section>
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div><p className="text-xs font-black uppercase tracking-[0.2em] text-savoury-primary">Kitchen inventory</p><h2 className="mt-1 text-2xl font-black">Operational Stock</h2><p className="mt-1 text-sm font-semibold text-zinc-500">Restock quantities and control live menu availability.</p></div>
        <div className="grid grid-cols-2 gap-2"><StockMetric label="Low stock" value={lowStock} tone="amber" /><StockMetric label="Unavailable" value={unavailable} tone="red" /></div>
      </div>

      <label className="mt-5 flex h-12 max-w-xl items-center gap-3 rounded-xl border border-zinc-200 bg-white px-4 dark:border-white/10 dark:bg-[#171717]"><Search className="h-4 w-4 text-zinc-400" /><input className="min-w-0 flex-1 bg-transparent text-sm font-bold outline-none" placeholder="Search food or category" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
      {Boolean(error) && <p className="mt-4 rounded-xl bg-red-500/10 px-4 py-3 text-sm font-black text-red-500">{error instanceof Error ? error.message : "Could not load kitchen stock."}</p>}

      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((item) => <KitchenStockCard key={item.id} item={item} updating={updatingId === item.id} onUpdate={onUpdate} />)}
        {!filtered.length && <div className="rounded-xl border border-dashed border-zinc-200 p-8 text-center text-sm font-semibold text-zinc-500 dark:border-white/10">No stock items match this search.</div>}
      </div>

      <Card className="mt-6"><CardContent><div className="flex items-center gap-3"><History className="h-5 w-5 text-savoury-primary" /><div><h3 className="font-black">Recent stock activity</h3><p className="text-sm font-semibold text-zinc-500">Latest quantity and availability changes.</p></div></div><div className="mt-4 grid gap-2">{adjustments.slice(0, 10).map((entry) => <div key={entry.id} className="flex flex-col justify-between gap-2 rounded-xl bg-zinc-50 p-3 dark:bg-white/5 sm:flex-row sm:items-center"><div><p className="text-sm font-black">{entry.foodName}</p><p className="text-xs font-semibold text-zinc-500">{entry.previousQuantity} → {entry.newQuantity} · {entry.reason}</p></div><time className="text-xs font-bold text-zinc-400">{new Date(entry.createdAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</time></div>)}{!adjustments.length && <div className="rounded-xl border border-dashed border-zinc-200 p-6 text-center text-sm font-semibold text-zinc-500 dark:border-white/10">No stock adjustments recorded yet.</div>}</div></CardContent></Card>
    </section>
  );
}

function KitchenStockCard({ item, updating, onUpdate }: { item: KitchenStockItem; updating: boolean; onUpdate: (item: KitchenStockItem, input: { quantityChange?: number; reason: string; available?: boolean }) => Promise<void> }) {
  const [quantity, setQuantity] = useState(5);
  const [reason, setReason] = useState("Kitchen restock");
  const available = item.isAvailable && item.stockQuantity > 0;
  return (
    <Card className="overflow-hidden"><div className="grid grid-cols-[88px_1fr] gap-3 p-4"><img src={item.image} alt={item.name} className="h-20 w-[88px] rounded-xl object-cover" /><div className="min-w-0"><div className="flex items-start justify-between gap-2"><div><h3 className="truncate font-black">{item.name}</h3><p className="text-xs font-semibold text-zinc-500">{item.category}</p></div><span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black ${available ? "bg-emerald-500/10 text-emerald-600" : "bg-red-500/10 text-red-500"}`}>{available ? "Available" : "Out"}</span></div><p className={`mt-3 text-2xl font-black ${item.stockQuantity <= 5 ? "text-amber-500" : "text-savoury-primary"}`}>{item.stockQuantity}<span className="ml-1 text-xs text-zinc-400">in stock</span></p></div></div><CardContent className="space-y-3 border-t border-zinc-100 pt-4 dark:border-white/10"><div className="grid grid-cols-[100px_1fr] gap-2"><Input type="number" min={1} value={quantity} onChange={(event) => setQuantity(Math.max(1, Number(event.target.value || 1)))} /><Input value={reason} placeholder="Adjustment reason" onChange={(event) => setReason(event.target.value)} /></div><div className="grid grid-cols-2 gap-2"><Button disabled={updating || quantity < 1 || reason.trim().length < 3} onClick={() => void onUpdate(item, { quantityChange: quantity, reason })}><PackagePlus className="h-4 w-4" /> {updating ? "Updating..." : `Add ${quantity}`}</Button>{available ? <Button variant="outline" disabled={updating} onClick={() => void onUpdate(item, { reason: "Marked unavailable by kitchen", available: false })}><PackageX className="h-4 w-4" /> Mark Out</Button> : <Button variant="outline" disabled={updating || item.stockQuantity === 0} onClick={() => void onUpdate(item, { reason: "Returned to service by kitchen", available: true })}><Boxes className="h-4 w-4" /> Back in Stock</Button>}</div></CardContent></Card>
  );
}

function StockMetric({ label, value, tone }: { label: string; value: number; tone: "amber" | "red" }) { return <div className={`min-w-28 rounded-xl px-4 py-3 ${tone === "amber" ? "bg-amber-500/10 text-amber-600" : "bg-red-500/10 text-red-500"}`}><p className="text-[10px] font-black uppercase">{label}</p><p className="text-xl font-black">{value}</p></div>; }

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
