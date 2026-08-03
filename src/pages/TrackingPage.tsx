import { CheckCircle2, ChefHat, Clock, MapPin, PackageCheck, Phone, Truck, XCircle, type LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { mockOrders } from "@/data/catalog";
import { formatCurrency } from "@/lib/utils";
import { fetchAdminOrders, getAdminOrders, type AdminOrderStatus } from "@/services/orderStorage";

type TrackingStatus = Exclude<AdminOrderStatus, "pending">;

const steps: Array<{ id: TrackingStatus; label: string; copy: string; icon: LucideIcon }> = [
  { id: "preparing", label: "Preparing", copy: "The kitchen has accepted your order.", icon: ChefHat },
  { id: "ready", label: "Ready", copy: "Your meal is packed and ready.", icon: PackageCheck },
  { id: "out_for_delivery", label: "Out for Delivery", copy: "Your rider is on the way.", icon: Truck },
  { id: "delivered", label: "Delivered", copy: "Order completed. Enjoy your meal.", icon: CheckCircle2 },
];

export function TrackingPage() {
  const { orderId } = useParams();
  const [orders, setOrders] = useState(() => getAdminOrders());
  const [showReceipt, setShowReceipt] = useState(false);
  const order = orders.find((item) => item.id === orderId) || mockOrders.find((item) => item.id === orderId) || orders[0] || mockOrders[0];
  const status = order.status;
  const pending = status === "pending";
  const rejected = status === "rejected";
  const activeIndex = rejected || pending ? -1 : steps.findIndex((step) => step.id === status);
  const progress = activeIndex <= 0 ? 0 : (activeIndex / (steps.length - 1)) * 100;

  useEffect(() => {
    let mounted = true;
    const refreshOrders = async () => {
      const nextOrders = await fetchAdminOrders();
      if (mounted) setOrders(nextOrders);
    };
    refreshOrders();
    window.addEventListener("savoury-orders-updated", refreshOrders);
    window.addEventListener("storage", refreshOrders);
    return () => {
      mounted = false;
      window.removeEventListener("savoury-orders-updated", refreshOrders);
      window.removeEventListener("storage", refreshOrders);
    };
  }, []);

  return (
    <main className="bg-savoury-background py-8 text-zinc-950 dark:bg-[#101010] dark:text-white">
      <div className="app-container">
        <section className="relative overflow-hidden rounded-2xl bg-savoury-primary p-5 text-white shadow-premium md:p-6">
          <img src="/images/savoury-reference-hero.jpg" alt="" className="absolute inset-0 h-full w-full object-cover opacity-20" />
          <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <p className="font-black uppercase text-savoury-secondary">Live order tracking</p>
              <h1 className="mt-2 font-display text-3xl font-black md:text-4xl">Order {order.id}</h1>
              <p className="mt-3 max-w-2xl text-sm font-semibold text-white/80">
                Track your order from preparation to delivery using the same status flow managed by the restaurant team.
              </p>
            </div>
            <div className="rounded-xl bg-white/10 px-5 py-4 backdrop-blur">
              <p className="text-xs font-black uppercase text-white/60">Estimated delivery</p>
              <p className="mt-1 text-2xl font-black">{status === "delivered" ? "Delivered" : pending ? "Awaiting" : "25-45 min"}</p>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          <InfoCard icon={Clock} label="Current Status" value={pending ? "Awaiting confirmation" : rejected ? "Rejected" : steps[activeIndex]?.label || "Preparing"} />
          <InfoCard icon={MapPin} label="Delivery Address" value={order.address} />
          <InfoCard icon={Phone} label="Customer Phone" value={order.phone} />
        </section>

        {pending ? (
          <Card className="mt-5 overflow-hidden border-savoury-primary/20 bg-white shadow-soft dark:border-white/10 dark:bg-[#181818]">
            <CardContent className="p-4 md:p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <span className="relative mt-1 grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-savoury-accent text-savoury-primary dark:bg-savoury-primary/10">
                    <Clock className="h-5 w-5" />
                    <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-savoury-secondary ring-4 ring-white dark:ring-[#181818]" />
                  </span>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-black text-zinc-950 dark:text-white">Awaiting restaurant confirmation</h2>
                      <span className="rounded-full bg-savoury-accent px-2.5 py-1 text-[11px] font-black uppercase text-savoury-primary dark:bg-savoury-primary/10">
                        Pending
                      </span>
                    </div>
                    <p className="mt-1 max-w-2xl text-sm font-semibold text-zinc-500">
                      Your order is in the kitchen queue. The restaurant will accept it and start preparing, or reject it if unavailable.
                    </p>
                  </div>
                </div>
                <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-3 text-sm dark:border-white/10 dark:bg-white/5">
                  <p className="text-xs font-black uppercase text-zinc-500">Next update</p>
                  <p className="font-black text-zinc-950 dark:text-white">Preparing</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : rejected ? (
          <Card className="mt-6 border-red-200 bg-red-50 dark:border-red-500/30 dark:bg-red-950/20">
            <CardContent className="text-center">
              <XCircle className="mx-auto h-14 w-14 text-red-600" />
              <h2 className="mt-4 text-2xl font-black text-red-700 dark:text-red-300">Order Rejected</h2>
              <p className="mx-auto mt-2 max-w-xl text-sm font-semibold text-red-700/80 dark:text-red-200/80">
                The restaurant could not accept this order. Please contact support or place a new order.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="mt-6">
            <CardContent className="p-6 md:p-8">
              <div className="mb-8 flex flex-col justify-between gap-3 md:flex-row md:items-center">
                <div>
                  <h2 className="text-2xl font-black">Delivery Progress</h2>
                  <p className="mt-1 text-sm font-semibold text-zinc-500">Preparing, Ready, Out for Delivery, Delivered.</p>
                </div>
                <span className="w-fit rounded-full bg-savoury-accent px-4 py-2 text-sm font-black text-savoury-primary dark:bg-savoury-primary/10">
                  {Math.round(progress)}% complete
                </span>
              </div>

              <div className="relative">
                <div className="absolute left-6 top-6 h-[calc(100%-3rem)] w-1 rounded-full bg-zinc-100 dark:bg-white/10 md:left-0 md:top-8 md:h-1 md:w-full" />
                <motion.div
                  className="absolute left-6 top-6 w-1 rounded-full bg-savoury-primary md:left-0 md:top-8 md:h-1"
                  initial={{ height: 0, width: 0 }}
                  animate={{ height: `${progress}%`, width: `${progress}%` }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                />
                <div className="relative grid gap-6 md:grid-cols-4">
                  {steps.map((step, index) => {
                    const Icon = step.icon;
                    const complete = index <= activeIndex;
                    const current = index === activeIndex;
                    return (
                      <motion.div key={step.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.08 }} className="flex items-center gap-4 md:flex-col md:text-center">
                        <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl border-4 transition ${complete ? "border-savoury-accent bg-savoury-primary text-white" : "border-zinc-100 bg-white text-zinc-400 dark:border-white/10 dark:bg-zinc-950"}`}>
                          <Icon className="h-6 w-6" />
                        </span>
                        <div>
                          <h3 className="font-black text-zinc-950 dark:text-white">{step.label}</h3>
                          <p className="text-sm text-zinc-500">{current ? step.copy : complete ? "Complete" : "Pending"}</p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_0.75fr]">
          <Card>
            <CardContent>
              <h2 className="text-xl font-black">Order Summary</h2>
              <div className="mt-4 grid gap-3">
                {order.items.map((item) => (
                  <div key={item.food.id} className="flex items-center justify-between rounded-xl border border-zinc-100 p-3 dark:border-white/10">
                    <div className="flex items-center gap-3">
                      <img src={item.food.image} alt={item.food.name} className="h-14 w-14 rounded-xl object-cover" />
                      <div>
                        <p className="font-black">{item.food.name}</p>
                        <p className="text-sm text-zinc-500">Qty {item.quantity}</p>
                      </div>
                    </div>
                    <p className="font-black text-savoury-primary">{formatCurrency(item.food.price * item.quantity)}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <h2 className="text-xl font-black">Need Help?</h2>
              <p className="mt-2 text-sm font-semibold text-zinc-500">Contact the restaurant if your order status has not changed for a while.</p>
              <div className="mt-5 grid gap-3">
                <Button onClick={() => { window.location.href = "tel:+2348123456789"; }}><Phone className="h-4 w-4" /> Call Restaurant</Button>
                <Button variant="outline" onClick={() => setShowReceipt((current) => !current)}>
                  {showReceipt ? "Hide Receipt" : "View Receipt"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>

        {showReceipt && (
          <Card className="mt-6">
            <CardContent>
              <div className="flex flex-col justify-between gap-3 border-b border-zinc-100 pb-4 dark:border-white/10 sm:flex-row sm:items-start">
                <div>
                  <p className="text-xs font-black uppercase text-zinc-500">Receipt</p>
                  <h2 className="mt-1 text-2xl font-black">Savoury Order {order.id}</h2>
                  <p className="mt-1 text-sm font-semibold text-zinc-500">{new Date(order.createdAt).toLocaleString()}</p>
                </div>
                <span className="w-fit rounded-full bg-savoury-accent px-4 py-2 text-sm font-black text-savoury-primary dark:bg-savoury-primary/10">
                  {status.replace(/_/g, " ")}
                </span>
              </div>
              <div className="mt-4 grid gap-3">
                {order.items.map((item) => (
                  <div key={item.food.id} className="flex justify-between gap-3 text-sm font-semibold">
                    <span>{item.quantity} x {item.food.name}</span>
                    <span>{formatCurrency(item.food.price * item.quantity)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex justify-between border-t border-zinc-100 pt-4 text-lg font-black dark:border-white/10">
                <span>Total</span>
                <span className="text-savoury-primary">{formatCurrency(order.total)}</span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}

function InfoCard({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <Card>
      <CardContent>
        <Icon className="h-6 w-6 text-savoury-primary" />
        <p className="mt-3 text-xs font-black uppercase text-zinc-500">{label}</p>
        <p className="mt-1 font-black">{value}</p>
      </CardContent>
    </Card>
  );
}
