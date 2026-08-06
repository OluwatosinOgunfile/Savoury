import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2, ChevronLeft, ChevronRight, Clock3, LoaderCircle, Search, ShoppingBag, XCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { formatCurrency } from "@/lib/utils";
import { fetchAdminOrders, getAdminOrders, updateStoredOrderStatus, type AdminOrderStatus, type StoredOrder } from "@/services/orderStorage";

const orderKey = ["admin-orders"] as const;
const pageSize = 20;
const editableStatuses: AdminOrderStatus[] = ["preparing", "ready", "out_for_delivery", "delivered"];

export function AdminOrdersPage() {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | AdminOrderStatus>("all");
  const [source, setSource] = useState<"all" | "app" | "pos">("all");
  const [page, setPage] = useState(1);
  const [now, setNow] = useState(Date.now());
  const [updating, setUpdating] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const { data: orders = [], isLoading, error } = useQuery({
    queryKey: orderKey,
    queryFn: () => fetchAdminOrders(),
    initialData: getAdminOrders,
    refetchInterval: 10000,
  });

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return orders.filter((order) => {
      const matchesQuery = !term || [order.id, order.receiptNumber || "", order.customerName, order.phone].some((value) => value.toLowerCase().includes(term));
      return matchesQuery && (status === "all" || order.status === status) && (source === "all" || order.source === source);
    });
  }, [orders, query, source, status]);

  useEffect(() => setPage(1), [query, source, status]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visibleOrders = filtered.slice((page - 1) * pageSize, page * pageSize);
  const pendingCount = orders.filter((order) => order.status === "pending" && order.source !== "pos").length;
  const activeCount = orders.filter((order) => ["preparing", "ready", "out_for_delivery"].includes(order.status)).length;

  const updateStatus = async (order: StoredOrder, nextStatus: AdminOrderStatus) => {
    setUpdating(order.id);
    queryClient.setQueryData<StoredOrder[]>(orderKey, (current = []) => current.map((item) => item.id === order.id ? { ...item, status: nextStatus } : item));
    try {
      await updateStoredOrderStatus(order.id, nextStatus, order);
      setFeedback(`${order.receiptNumber || order.id} moved to ${nextStatus.replace(/_/g, " ")}.`);
      void queryClient.invalidateQueries({ queryKey: orderKey });
    } catch (updateError) {
      queryClient.setQueryData<StoredOrder[]>(orderKey, (current = []) => current.map((item) => item.id === order.id ? order : item));
      setFeedback(updateError instanceof Error ? updateError.message : "Could not update this order.");
    } finally {
      setUpdating(null);
    }
  };

  return (
    <main className="app-container py-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <Link to="/admin" className="inline-flex items-center gap-2 text-sm font-black text-savoury-primary"><ArrowLeft className="h-4 w-4" /> Back to Dashboard</Link>
          <p className="mt-5 text-xs font-black uppercase tracking-[0.2em] text-savoury-primary">Restaurant operations</p>
          <h1 className="section-title text-3xl md:text-4xl">All Orders</h1>
          <p className="mt-2 text-sm font-semibold text-zinc-500">Search, review, and process customer app and POS delivery orders.</p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Metric label="Total" value={orders.length} />
          <Metric label="Awaiting" value={pendingCount} />
          <Metric label="Active" value={activeCount} />
        </div>
      </div>

      {feedback && <div className="mt-5 rounded-xl border border-savoury-primary/20 bg-savoury-primary/10 px-4 py-3 text-sm font-black text-savoury-primary">{feedback}</div>}
      {error && <div className="mt-5 rounded-xl bg-red-500/10 px-4 py-3 text-sm font-black text-red-500">{error instanceof Error ? error.message : "Could not load orders."}</div>}

      <Card className="mt-6"><CardContent>
        <div className="grid gap-3 lg:grid-cols-[1fr_190px_190px]">
          <label className="flex h-12 items-center gap-3 rounded-xl border border-zinc-200 bg-white px-4 dark:border-white/10 dark:bg-zinc-950"><Search className="h-4 w-4 text-zinc-400" /><Input className="h-auto border-0 bg-transparent p-0 shadow-none dark:bg-transparent" placeholder="Search order, customer, or phone" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
          <select className="h-12 rounded-xl border border-zinc-200 bg-white px-4 text-sm font-bold dark:border-white/10 dark:bg-zinc-950" value={status} onChange={(event) => setStatus(event.target.value as "all" | AdminOrderStatus)}><option value="all">All statuses</option>{(["pending", "preparing", "ready", "out_for_delivery", "delivered", "rejected"] as AdminOrderStatus[]).map((item) => <option key={item} value={item}>{item.replace(/_/g, " ")}</option>)}</select>
          <select className="h-12 rounded-xl border border-zinc-200 bg-white px-4 text-sm font-bold dark:border-white/10 dark:bg-zinc-950" value={source} onChange={(event) => setSource(event.target.value as "all" | "app" | "pos")}><option value="all">App and POS</option><option value="app">Customer app</option><option value="pos">POS delivery</option></select>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="text-xs uppercase text-zinc-400"><tr><th className="py-3">Order</th><th>Customer</th><th>Source</th><th>Status</th><th>Placed</th><th>Total</th><th>Processing</th></tr></thead>
            <tbody>{visibleOrders.map((order) => <OrderRow key={order.id} order={order} now={now} updating={updating === order.id} onUpdate={updateStatus} />)}</tbody>
          </table>
          {!visibleOrders.length && !isLoading && <div className="rounded-xl border border-dashed border-zinc-200 p-10 text-center dark:border-white/10"><ShoppingBag className="mx-auto h-8 w-8 text-zinc-300" /><p className="mt-3 font-black">No orders match these filters.</p></div>}
          {isLoading && <div className="flex items-center justify-center gap-2 p-10 font-bold text-zinc-500"><LoaderCircle className="h-5 w-5 animate-spin" /> Loading orders...</div>}
        </div>

        <div className="mt-4 flex flex-col justify-between gap-3 border-t border-zinc-100 pt-4 dark:border-white/10 sm:flex-row sm:items-center">
          <p className="text-sm font-semibold text-zinc-500">Showing {visibleOrders.length} of {filtered.length} matching orders</p>
          <div className="flex items-center gap-2"><Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage((current) => current - 1)}><ChevronLeft className="h-4 w-4" /> Previous</Button><span className="px-2 text-sm font-black">{page} / {pageCount}</span><Button size="sm" variant="outline" disabled={page >= pageCount} onClick={() => setPage((current) => current + 1)}>Next <ChevronRight className="h-4 w-4" /></Button></div>
        </div>
      </CardContent></Card>
    </main>
  );
}

function OrderRow({ order, now, updating, onUpdate }: { order: StoredOrder; now: number; updating: boolean; onUpdate: (order: StoredOrder, status: AdminOrderStatus) => Promise<void> }) {
  const availableStatuses = order.source === "pos"
    ? order.status === "ready" ? ["ready", "out_for_delivery"] as AdminOrderStatus[] : order.status === "out_for_delivery" ? ["out_for_delivery", "delivered"] as AdminOrderStatus[] : []
    : editableStatuses;
  return <tr className="border-t border-zinc-100 dark:border-white/10">
    <td className="py-4"><Link className="font-black text-savoury-primary hover:underline" to={`/admin/orders/${order.id}`}>{order.receiptNumber || order.id}</Link></td>
    <td><p className="font-bold">{order.customerName}</p><p className="text-xs text-zinc-500">{order.phone}</p></td>
    <td><span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[10px] font-black uppercase dark:bg-white/10">{order.source === "pos" ? "POS" : "App"}</span></td>
    <td><StatusPill status={order.status} source={order.source} /></td>
    <td>{order.status === "pending" && order.source !== "pos" ? <div><p className="font-black text-savoury-primary">{waitingTime(order.createdAt, now)}</p><p className="text-xs text-zinc-500">waiting</p></div> : <span className="text-xs font-bold text-zinc-500">{new Date(order.createdAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</span>}</td>
    <td className="font-black">{formatCurrency(order.total)}</td>
    <td>{updating ? <span className="inline-flex items-center gap-2 text-xs font-black text-savoury-primary"><LoaderCircle className="h-4 w-4 animate-spin" /> Updating</span> : order.status === "pending" && order.source !== "pos" ? <div className="flex gap-2"><Button size="sm" variant="secondary" onClick={() => void onUpdate(order, "preparing")}><CheckCircle2 className="h-4 w-4" /> Accept</Button><Button size="sm" variant="outline" onClick={() => void onUpdate(order, "rejected")}><XCircle className="h-4 w-4" /> Reject</Button></div> : availableStatuses.length ? <select className="h-9 rounded-lg border border-zinc-200 bg-white px-2 text-xs font-bold dark:border-white/10 dark:bg-zinc-950" value={order.status} onChange={(event) => void onUpdate(order, event.target.value as AdminOrderStatus)}>{availableStatuses.map((item) => <option key={item} value={item}>{item.replace(/_/g, " ")}</option>)}</select> : <span className="text-xs font-bold text-zinc-400">{order.status === "rejected" ? "Rejected" : order.source === "pos" ? "Kitchen processing" : "Completed"}</span>}</td>
  </tr>;
}

function StatusPill({ status, source }: { status: AdminOrderStatus; source?: StoredOrder["source"] }) {
  if (status === "pending") return <span className="text-xs font-bold text-zinc-400">{source === "pos" ? "Kitchen queue" : "Awaiting approval"}</span>;
  const tone = status === "rejected" ? "bg-red-500/10 text-red-500" : "bg-savoury-primary/10 text-savoury-primary";
  return <span className={`rounded-full px-3 py-1 text-xs font-black capitalize ${tone}`}>{status.replace(/_/g, " ")}</span>;
}

function Metric({ label, value }: { label: string; value: number }) { return <div className="min-w-24 rounded-xl bg-zinc-100 px-4 py-3 dark:bg-white/10"><p className="text-[10px] font-black uppercase text-zinc-500">{label}</p><p className="text-xl font-black">{value}</p></div>; }
function waitingTime(createdAt: string, now: number) { const seconds = Math.max(0, Math.floor((now - new Date(createdAt).getTime()) / 1000)); if (seconds < 60) return `${seconds} sec`; const minutes = Math.floor(seconds / 60); if (minutes < 60) return `${minutes} min`; const hours = Math.floor(minutes / 60); if (hours < 24) return `${hours} hr`; const days = Math.floor(hours / 24); return `${days} day${days === 1 ? "" : "s"}`; }
