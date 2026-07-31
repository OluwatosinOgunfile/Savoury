import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Activity, BarChart3, CheckCircle2, Clock, ListChecks, PackagePlus, Star, Users, XCircle, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { categories, foods, reviews } from "@/data/catalog";
import { formatCurrency } from "@/lib/utils";
import { mergeAdminFoods } from "@/services/adminMenuStorage";
import { fetchCategories, fetchFoods, fetchReviews, foodKeys } from "@/services/foodService";
import { fetchAdminOrders, getAdminOrders, updateStoredOrderStatus, type AdminOrderStatus, type StoredOrder } from "@/services/orderStorage";
import type { Food } from "@/types";

const orderStatusOptions: AdminOrderStatus[] = ["preparing", "ready", "out_for_delivery", "delivered"];

const userSessions = [
  { id: "u1", name: "Adaeze O.", email: "adaeze@example.com", status: "online", lastSeen: "Now", cartItems: 3, currentPage: "Checkout" },
  { id: "u2", name: "Emeka K.", email: "emeka@example.com", status: "online", lastSeen: "2 min ago", cartItems: 1, currentPage: "Food Details" },
  { id: "u3", name: "Fatima A.", email: "fatima@example.com", status: "away", lastSeen: "8 min ago", cartItems: 0, currentPage: "Menu" },
  { id: "u4", name: "Tunde A.", email: "tunde@example.com", status: "offline", lastSeen: "1 hr ago", cartItems: 0, currentPage: "Account" },
];

const activityFeed = [
  { id: "a1", user: "Adaeze O.", action: "started checkout", time: "Just now" },
  { id: "a2", user: "Emeka K.", action: "added Pounded Yam to cart", time: "2 min ago" },
  { id: "a3", user: "Fatima A.", action: "searched for shawarma", time: "8 min ago" },
  { id: "a4", user: "Tunde A.", action: "viewed order history", time: "1 hr ago" },
];

export function AdminDashboard() {
  const navigate = useNavigate();
  const { data: menuFoods = foods } = useQuery({ queryKey: foodKeys.all, queryFn: fetchFoods });
  const { data: menuCategories = categories } = useQuery({ queryKey: foodKeys.categories, queryFn: fetchCategories });
  const { data: highlightedReviews = reviews } = useQuery({
    queryKey: foodKeys.reviews(menuFoods[0]?.id || "none"),
    queryFn: () => (menuFoods[0] ? fetchReviews(menuFoods[0].id) : Promise.resolve(reviews)),
  });

  const [orders, setOrders] = useState<StoredOrder[]>(() => getAdminOrders());
  const [adminFoods, setAdminFoods] = useState<Food[]>(() => mergeAdminFoods(menuFoods));
  const [orderSearch, setOrderSearch] = useState("");
  const [feedback, setFeedback] = useState("Ready to manage today's operations.");

  useEffect(() => {
    setAdminFoods(mergeAdminFoods(menuFoods));
  }, [menuFoods]);

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

  const filteredOrders = useMemo(() => {
    const query = orderSearch.trim().toLowerCase();
    if (!query) return orders;
    return orders.filter((order) =>
      [order.id, order.customerName, order.phone, order.status].some((value) => value.toLowerCase().includes(query))
    );
  }, [orders, orderSearch]);

  const analytics = [
    { label: "Daily Revenue", value: orders.filter((order) => order.status !== "rejected").reduce((sum, order) => sum + order.total, 0) },
    { label: "Weekly Revenue", value: 2840000 },
    { label: "Monthly Revenue", value: 11860000 },
    { label: "Top Selling Foods", value: adminFoods.filter((food) => food.isTrending).length },
    { label: "Popular Categories", value: menuCategories.filter((category) => !category.parent).length },
  ];
  const onlineUsers = userSessions.filter((user) => user.status === "online").length;
  const availableUsers = userSessions.filter((user) => user.status !== "offline").length;

  const updateOrderStatus = (orderId: string, status: AdminOrderStatus) => {
    setOrders((current) => {
      const targetOrder = current.find((order) => order.id === orderId);
      if (targetOrder) {
        updateStoredOrderStatus(orderId, status, targetOrder);
      }
      return current.map((order) => (order.id === orderId ? { ...order, status } : order));
    });
    setFeedback(`Order ${orderId} moved to ${status.replace(/_/g, " ")}.`);
  };

  return (
    <main className="app-container py-6">
      <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="font-black uppercase text-savoury-primary">Admin dashboard</p>
          <h1 className="section-title text-4xl md:text-5xl">Restaurant operations center</h1>
          <p className="mt-2 text-zinc-500">Manage orders, menu, categories, coupons, customers, reviews, images, and analytics.</p>
        </div>
        <Button size="lg" className="text-base md:text-lg" onClick={() => navigate("/admin/menu")}><ListChecks className="h-5 w-5" /> Menu Manager</Button>
      </div>

      <div className="mb-6 rounded-xl border border-savoury-primary/20 bg-savoury-accent px-4 py-3 text-sm font-black text-savoury-primary dark:bg-savoury-primary/10">
        {feedback}
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {analytics.map((item) => (
          <Card key={item.label}>
            <CardContent>
              <BarChart3 className="h-6 w-6 text-savoury-primary" />
              <p className="mt-3 text-sm font-bold text-zinc-500">{item.label}</p>
              <p className="mt-1 text-2xl font-black">{typeof item.value === "number" && item.value > 100000 ? formatCurrency(item.value) : item.value}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="mt-6">
        <Card>
          <CardContent>
            <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <h2 className="text-xl font-black">View Orders</h2>
              <Input className="max-w-xs" placeholder="Search orders" value={orderSearch} onChange={(event) => setOrderSearch(event.target.value)} />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead className="text-xs uppercase text-zinc-400">
                  <tr><th className="py-3">Order</th><th>Customer</th><th>Status</th><th>Total</th><th>Update</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="border-t border-zinc-100 dark:border-white/10">
                      <td className="py-4 font-black">{order.id}</td>
                      <td>{order.customerName}<p className="text-xs text-zinc-500">{order.phone}</p></td>
                      <td><StatusPill status={order.status} /></td>
                      <td className="font-black">{formatCurrency(order.total)}</td>
                      <td>
                        {order.status !== "pending" && order.status !== "rejected" ? (
                          <select className="h-9 rounded-lg border border-zinc-200 bg-white px-2 text-xs font-bold dark:border-white/10 dark:bg-zinc-950" value={order.status} onChange={(event) => updateOrderStatus(order.id, event.target.value as AdminOrderStatus)}>
                            {orderStatusOptions.map((status) => <option key={status} value={status}>{status.replace(/_/g, " ")}</option>)}
                          </select>
                        ) : (
                          <span className="text-xs font-bold text-zinc-400">Hidden</span>
                        )}
                      </td>
                      <td>
                        <div className="flex gap-2">
                          {order.status === "pending" ? (
                            <>
                              <Button size="sm" variant="secondary" onClick={() => updateOrderStatus(order.id, "preparing")}><CheckCircle2 className="h-4 w-4" /> Accept</Button>
                              <Button size="sm" variant="outline" onClick={() => updateOrderStatus(order.id, "rejected")}><XCircle className="h-4 w-4" /> Reject</Button>
                            </>
                          ) : (
                            <span className="text-xs font-bold text-zinc-400">{order.status === "rejected" ? "Rejected" : "Accepted"}</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <Card>
          <CardContent>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black">User Availability</h2>
                <p className="mt-1 text-sm font-semibold text-zinc-500">Monitor customers currently active on the platform.</p>
              </div>
              <Users className="h-8 w-8 text-savoury-primary" />
            </div>
            <div className="mt-5 grid grid-cols-3 gap-3">
              <Metric label="Total Users" value={userSessions.length} />
              <Metric label="Available" value={availableUsers} />
              <Metric label="Online Now" value={onlineUsers} />
            </div>
            <div className="mt-5 space-y-3">
              {userSessions.map((user) => (
                <div key={user.id} className="flex items-center justify-between gap-3 rounded-xl border border-zinc-100 p-3 dark:border-white/10">
                  <div className="min-w-0">
                    <p className="truncate font-black">{user.name}</p>
                    <p className="truncate text-xs font-semibold text-zinc-500">{user.email}</p>
                  </div>
                  <div className="text-right">
                    <StatusDot status={user.status} />
                    <p className="mt-1 text-xs text-zinc-500">{user.lastSeen}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black">User Activity Feed</h2>
                <p className="mt-1 text-sm font-semibold text-zinc-500">Recent browsing, cart, checkout, and account actions.</p>
              </div>
              <Activity className="h-8 w-8 text-savoury-primary" />
            </div>
            <div className="mt-5 grid gap-3">
              {activityFeed.map((activity) => (
                <div key={activity.id} className="rounded-xl bg-zinc-50 p-4 dark:bg-white/10">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-black">{activity.user}</p>
                      <p className="mt-1 text-sm font-semibold text-zinc-500">{activity.action}</p>
                    </div>
                    <span className="flex shrink-0 items-center gap-1 text-xs font-bold text-zinc-500"><Clock className="h-3 w-3" /> {activity.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-3">
        <AdminPanel icon={PackagePlus} title="Categories and Coupons" items={[`${menuCategories.length} categories from Supabase`, "SAVOURY15 active", "FAST1000 active", "Referral rewards active"]} />
        <AdminPanel icon={Users} title="Customers" items={["2,400 customer profiles", "Saved addresses enabled", "Role based access: admin and customer", "Secure Supabase auth ready"]} />
        <AdminPanel icon={Star} title="Reviews" items={[`${highlightedReviews.length} highlighted reviews from Supabase`, "Food image uploads ready", "Helpful likes enabled", "Moderation workflow ready"]} />
      </section>
    </main>
  );
}

function StatusPill({ status }: { status: AdminOrderStatus }) {
  if (status === "pending") {
    return <span className="text-xs font-bold text-zinc-400">—</span>;
  }

  const tone = status === "rejected" ? "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300" : "bg-savoury-accent text-savoury-primary dark:bg-savoury-primary/10";
  return <span className={`rounded-full px-3 py-1 font-black capitalize ${tone}`}>{status.replace(/_/g, " ")}</span>;
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-zinc-50 p-4 text-center dark:bg-white/10">
      <p className="text-2xl font-black text-savoury-primary">{value}</p>
      <p className="mt-1 text-xs font-black uppercase text-zinc-500">{label}</p>
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  const tone = status === "online" ? "bg-emerald-500" : status === "away" ? "bg-amber-500" : "bg-zinc-400";
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-zinc-100 px-3 py-1 text-xs font-black capitalize text-zinc-700 dark:bg-white/10 dark:text-zinc-200">
      <span className={`h-2 w-2 rounded-full ${tone}`} />
      {status}
    </span>
  );
}

function AdminPanel({ icon: Icon, title, items }: { icon: LucideIcon; title: string; items: string[] }) {
  return (
    <Card>
      <CardContent>
        <Icon className="h-7 w-7 text-savoury-primary" />
        <h2 className="mt-3 text-xl font-black">{title}</h2>
        <div className="mt-4 grid gap-2">
          {items.map((item) => <p key={item} className="rounded-xl bg-zinc-50 px-4 py-3 text-sm font-bold text-zinc-600 dark:bg-white/10 dark:text-zinc-300">{item}</p>)}
        </div>
      </CardContent>
    </Card>
  );
}
