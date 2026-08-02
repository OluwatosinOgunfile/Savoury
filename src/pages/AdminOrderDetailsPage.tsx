import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Clock, CreditCard, MapPin, Phone, ReceiptText, ShoppingBag, User, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { formatCurrency } from "@/lib/utils";
import { fetchAdminOrders, getAdminOrders, type AdminOrderStatus, type StoredOrder } from "@/services/orderStorage";

export function AdminOrderDetailsPage() {
  const { orderId } = useParams();
  const [orders, setOrders] = useState<StoredOrder[]>(() => getAdminOrders());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const loadOrder = async () => {
      setLoading(true);
      const nextOrders = await fetchAdminOrders();
      if (!mounted) return;
      setOrders(nextOrders);
      setLoading(false);
    };

    loadOrder();
    window.addEventListener("savoury-orders-updated", loadOrder);
    window.addEventListener("storage", loadOrder);
    return () => {
      mounted = false;
      window.removeEventListener("savoury-orders-updated", loadOrder);
      window.removeEventListener("storage", loadOrder);
    };
  }, []);

  const order = useMemo(() => orders.find((item) => item.id === orderId), [orderId, orders]);
  const itemCount = order?.items.reduce((sum, item) => sum + item.quantity, 0) || 0;

  if (loading) {
    return (
      <main className="app-container py-6">
        <div className="h-9 w-44 animate-pulse rounded-lg bg-zinc-100 dark:bg-white/10" />
        <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_360px]">
          <div className="h-96 animate-pulse rounded-2xl bg-zinc-100 dark:bg-white/10" />
          <div className="h-96 animate-pulse rounded-2xl bg-zinc-100 dark:bg-white/10" />
        </div>
      </main>
    );
  }

  if (!order) {
    return (
      <main className="app-container py-6">
        <Link to="/admin">
          <Button variant="outline"><ArrowLeft className="h-4 w-4" /> Back to Dashboard</Button>
        </Link>
        <Card className="mt-6">
          <CardContent className="text-center">
            <ReceiptText className="mx-auto h-12 w-12 text-savoury-primary" />
            <h1 className="mt-4 text-2xl font-black">Order not found</h1>
            <p className="mt-2 text-sm font-semibold text-zinc-500">This order may have been removed or has not synced from Supabase yet.</p>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="app-container py-6">
      <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <Link to="/admin" className="inline-flex items-center gap-2 text-sm font-black text-savoury-primary">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
          <p className="mt-5 font-black uppercase text-savoury-primary">Order details</p>
          <h1 className="section-title text-4xl md:text-5xl">Order {order.id}</h1>
          <p className="mt-2 text-zinc-500">Review the customer information and every meal submitted in this order.</p>
        </div>
        <StatusPill status={order.status} />
      </div>

      <section className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <Card>
          <CardContent>
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black">Order Items</h2>
                <p className="mt-1 text-sm font-semibold text-zinc-500">{itemCount} item{itemCount === 1 ? "" : "s"} placed by customer</p>
              </div>
              <ShoppingBag className="h-7 w-7 text-savoury-primary" />
            </div>

            <div className="grid gap-4">
              {order.items.map((item) => (
                <div key={item.food.id} className="flex flex-col gap-4 rounded-xl border border-zinc-100 p-4 dark:border-white/10 sm:flex-row sm:items-center">
                  <img src={item.food.image} alt={item.food.name} className="h-28 w-full rounded-xl object-cover sm:h-24 sm:w-28" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
                      <div>
                        <h3 className="font-black">{item.food.name}</h3>
                        <p className="mt-1 line-clamp-2 text-sm font-semibold text-zinc-500">{item.food.description}</p>
                      </div>
                      <p className="shrink-0 font-black text-savoury-primary">{formatCurrency(item.food.price * item.quantity)}</p>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs font-black text-zinc-500">
                      <span className="rounded-full bg-zinc-50 px-3 py-1 dark:bg-white/10">Qty {item.quantity}</span>
                      <span className="rounded-full bg-zinc-50 px-3 py-1 dark:bg-white/10">{formatCurrency(item.food.price)} each</span>
                      <span className="rounded-full bg-zinc-50 px-3 py-1 dark:bg-white/10">{item.food.prepTime} min prep</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <aside className="space-y-6">
          <Card>
            <CardContent>
              <h2 className="text-xl font-black">Customer</h2>
              <InfoLine icon={User} label="Name" value={order.customerName} />
              <InfoLine icon={Phone} label="Phone" value={order.phone} />
              <InfoLine icon={MapPin} label="Address" value={order.address} />
              <InfoLine icon={CreditCard} label="Payment" value={order.paymentMethod} />
              <InfoLine icon={Clock} label="Placed" value={new Date(order.createdAt).toLocaleString()} />
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <h2 className="text-xl font-black">Summary</h2>
              <div className="mt-4 space-y-3 text-sm font-semibold">
                <Line label="Items" value={`${itemCount}`} />
                <Line label="Delivery option" value={order.deliveryMode} />
                <Line label="Status" value={order.status.replace(/_/g, " ")} />
                <Line label="Total" value={formatCurrency(order.total)} strong />
              </div>
              {order.instructions && (
                <div className="mt-5 rounded-xl bg-zinc-50 p-4 dark:bg-white/10">
                  <p className="text-xs font-black uppercase text-zinc-500">Special instructions</p>
                  <p className="mt-2 text-sm font-semibold">{order.instructions}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </aside>
      </section>
    </main>
  );
}

function StatusPill({ status }: { status: AdminOrderStatus }) {
  if (status === "pending") {
    return (
      <span className="inline-flex min-w-[160px] items-center justify-center whitespace-nowrap rounded-full bg-zinc-100 px-5 py-2 text-sm font-black text-zinc-500 dark:bg-white/10">
        Awaiting approval
      </span>
    );
  }

  const tone = status === "rejected" ? "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300" : "bg-savoury-accent text-savoury-primary dark:bg-savoury-primary/10";
  return <span className={`w-fit rounded-full px-4 py-2 text-sm font-black capitalize ${tone}`}>{status.replace(/_/g, " ")}</span>;
}

function InfoLine({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="mt-4 flex gap-3 rounded-xl bg-zinc-50 p-3 dark:bg-white/10">
      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-savoury-primary" />
      <div className="min-w-0">
        <p className="text-xs font-black uppercase text-zinc-500">{label}</p>
        <p className="mt-1 break-words font-bold capitalize">{value}</p>
      </div>
    </div>
  );
}

function Line({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between gap-4 ${strong ? "border-t border-zinc-100 pt-4 text-lg font-black dark:border-white/10" : ""}`}>
      <span className="text-zinc-500">{label}</span>
      <span className="text-right font-black capitalize">{value}</span>
    </div>
  );
}
