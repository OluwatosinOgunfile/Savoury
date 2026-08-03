import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { Activity, BarChart3, CheckCircle2, Clock, ListChecks, PackagePlus, Star, UserPlus, Users, X, XCircle, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/hooks/useAuth";
import { categories, foods } from "@/data/catalog";
import { formatCurrency } from "@/lib/utils";
import {
  adminDashboardKeys,
  createStaffMember,
  fetchAdminActivityEvents,
  fetchAdminCoupons,
  fetchAdminCustomers,
  fetchAdminReviews,
  fetchAdminUserSessions,
  fetchStaffMembers,
  type StaffInput,
} from "@/services/adminDashboardService";
import { mergeAdminFoods } from "@/services/adminMenuStorage";
import { fetchCategories, fetchFoods, foodKeys } from "@/services/foodService";
import { fetchAdminOrders, getAdminOrders, updateStoredOrderStatus, type AdminOrderStatus, type StoredOrder } from "@/services/orderStorage";
import type { Food } from "@/types";

const orderStatusOptions: AdminOrderStatus[] = ["preparing", "ready", "out_for_delivery", "delivered"];

export function AdminDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: menuFoods = foods } = useQuery({ queryKey: foodKeys.all, queryFn: fetchFoods });
  const { data: menuCategories = categories } = useQuery({ queryKey: foodKeys.categories, queryFn: fetchCategories });
  const { data: customers = [] } = useQuery({ queryKey: adminDashboardKeys.customers, queryFn: fetchAdminCustomers });
  const { data: userSessions = [] } = useQuery({ queryKey: adminDashboardKeys.sessions, queryFn: fetchAdminUserSessions, refetchInterval: 30000 });
  const { data: activityFeed = [] } = useQuery({ queryKey: adminDashboardKeys.activity, queryFn: fetchAdminActivityEvents, refetchInterval: 30000 });
  const { data: highlightedReviews = [] } = useQuery({ queryKey: adminDashboardKeys.reviews, queryFn: fetchAdminReviews });
  const { data: adminCoupons = [] } = useQuery({ queryKey: adminDashboardKeys.coupons, queryFn: fetchAdminCoupons });
  const { data: staffMembers = [] } = useQuery({ queryKey: adminDashboardKeys.staff, queryFn: fetchStaffMembers });

  const [orders, setOrders] = useState<StoredOrder[]>(() => getAdminOrders());
  const [adminFoods, setAdminFoods] = useState<Food[]>(() => mergeAdminFoods(menuFoods));
  const [orderSearch, setOrderSearch] = useState("");
  const [feedback, setFeedback] = useState("Ready to manage today's operations.");
  const [now, setNow] = useState(() => Date.now());
  const [staffModalOpen, setStaffModalOpen] = useState(false);

  useEffect(() => {
    setAdminFoods(mergeAdminFoods(menuFoods));
  }, [menuFoods]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);

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

  const fulfilledOrders = orders.filter((order) => order.status !== "rejected");
  const topFoodCounts = getTopFoodCounts(fulfilledOrders);
  const popularCategoryCounts = getPopularCategoryCounts(fulfilledOrders);
  const analytics = [
    { label: "Daily Revenue", value: getRevenueForDays(fulfilledOrders, 1), currency: true },
    { label: "Weekly Revenue", value: getRevenueForDays(fulfilledOrders, 7), currency: true },
    { label: "Monthly Revenue", value: getRevenueForDays(fulfilledOrders, 30), currency: true },
    { label: "Top Selling Foods", value: topFoodCounts.length },
    { label: "Popular Categories", value: popularCategoryCounts.length || menuCategories.filter((category) => !category.parent).length },
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

  const addStaff = async (input: StaffInput) => {
    await createStaffMember(input, user?.id);
    await queryClient.invalidateQueries({ queryKey: adminDashboardKeys.staff });
    setFeedback(`${input.fullName} has been added to staff as ${input.role}.`);
    setStaffModalOpen(false);
  };

  return (
    <main className="app-container py-6">
      <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="font-black uppercase text-savoury-primary">Admin dashboard</p>
          <h1 className="section-title text-3xl md:text-4xl">Restaurant operations center</h1>
          <p className="mt-2 text-zinc-500">Manage orders, menu, categories, coupons, customers, reviews, images, and analytics.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="lg" variant="outline" className="text-base md:text-lg" onClick={() => setStaffModalOpen(true)}><UserPlus className="h-5 w-5" /> Add Staff</Button>
          <Button size="lg" className="text-base md:text-lg" onClick={() => navigate("/admin/menu")}><ListChecks className="h-5 w-5" /> Menu Manager</Button>
        </div>
      </div>

      {staffModalOpen && <AddStaffModal onClose={() => setStaffModalOpen(false)} onSubmit={addStaff} />}

      <div className="mb-6 rounded-xl border border-savoury-primary/20 bg-savoury-accent px-4 py-3 text-sm font-black text-savoury-primary dark:bg-savoury-primary/10">
        {feedback}
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {analytics.map((item) => (
          <Card key={item.label}>
            <CardContent>
              <BarChart3 className="h-6 w-6 text-savoury-primary" />
              <p className="mt-3 text-sm font-bold text-zinc-500">{item.label}</p>
              <p className="mt-1 text-2xl font-black">{item.currency ? formatCurrency(item.value) : item.value}</p>
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
                  <tr><th className="py-3">Order</th><th>Customer</th><th>Status</th><th>Placed</th><th>Total</th><th>Update</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="border-t border-zinc-100 dark:border-white/10">
                      <td className="py-4 font-black">
                        <Link className="text-savoury-primary underline-offset-4 transition hover:underline" to={`/admin/orders/${order.id}`}>
                          {order.id}
                        </Link>
                      </td>
                      <td>{order.customerName}<p className="text-xs text-zinc-500">{order.phone}</p></td>
                      <td><StatusPill status={order.status} /></td>
                      <td>
                        {order.status === "pending" ? (
                          <div>
                            <p className="font-black text-savoury-primary">{formatWaitingTime(order.createdAt, now)}</p>
                            <p className="text-xs font-bold text-zinc-500">waiting</p>
                          </div>
                        ) : (
                          <span className="text-xs font-bold text-zinc-400">{formatOrderTime(order.createdAt)}</span>
                        )}
                      </td>
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
              <Metric label="Total Users" value={customers.length} />
              <Metric label="Available" value={availableUsers} />
              <Metric label="Online Now" value={onlineUsers} />
            </div>
            <div className="mt-5 space-y-3">
              {userSessions.length > 0 ? userSessions.map((user) => (
                <div key={user.id} className="flex items-center justify-between gap-3 rounded-xl border border-zinc-100 p-3 dark:border-white/10">
                  <div className="min-w-0">
                    <p className="truncate font-black">{user.name}</p>
                    <p className="truncate text-xs font-semibold text-zinc-500">{user.email}</p>
                    <p className="truncate text-xs font-semibold text-zinc-500">{user.currentPage} | {user.cartItems} cart item{user.cartItems === 1 ? "" : "s"}</p>
                  </div>
                  <div className="text-right">
                    <StatusDot status={user.status} />
                    <p className="mt-1 text-xs text-zinc-500">{formatWaitingTime(user.lastSeenAt, now)} ago</p>
                  </div>
                </div>
              )) : <EmptyState text="No live user sessions yet. Run the admin dashboard SQL patch and start recording sessions from the client." />}
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
              {activityFeed.length > 0 ? activityFeed.map((activity) => (
                <div key={activity.id} className="rounded-xl bg-zinc-50 p-4 dark:bg-white/10">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-black">{activity.user}</p>
                      <p className="mt-1 text-sm font-semibold text-zinc-500">{activity.action}{activity.page ? ` on ${activity.page}` : ""}</p>
                    </div>
                    <span className="flex shrink-0 items-center gap-1 text-xs font-bold text-zinc-500"><Clock className="h-3 w-3" /> {formatWaitingTime(activity.createdAt, now)} ago</span>
                  </div>
                </div>
              )) : <EmptyState text="No activity events yet. The dashboard will show events as soon as the app records them." />}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="mt-6">
        <Card>
          <CardContent>
            <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-xl font-black">Staff Members</h2>
                <p className="mt-1 text-sm font-semibold text-zinc-500">Staff added from this dashboard are saved in the database as invited team members.</p>
              </div>
              <Button size="sm" onClick={() => setStaffModalOpen(true)}><UserPlus className="h-4 w-4" /> Add Staff</Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-left text-sm">
                <thead className="text-xs uppercase text-zinc-400">
                  <tr><th className="py-3">Name</th><th>Email</th><th>Phone</th><th>Role</th><th>Status</th><th>Added</th></tr>
                </thead>
                <tbody>
                  {staffMembers.map((staff) => (
                    <tr key={staff.id} className="border-t border-zinc-100 dark:border-white/10">
                      <td className="py-4 font-black">{staff.fullName}</td>
                      <td>{staff.email}</td>
                      <td className="text-zinc-500">{staff.phone || "Not provided"}</td>
                      <td className="capitalize">{staff.role}</td>
                      <td><span className="rounded-full bg-savoury-accent px-3 py-1 text-xs font-black capitalize text-savoury-primary dark:bg-savoury-primary/10">{staff.status}</span></td>
                      <td className="text-xs font-bold text-zinc-500">{formatOrderTime(staff.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {staffMembers.length === 0 && <div className="mt-3"><EmptyState text="No staff members have been added yet." /></div>}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-3">
        <AdminPanel
          icon={PackagePlus}
          title="Categories and Coupons"
          items={[
            `${menuCategories.length} categories from database`,
            `${adminCoupons.length} active coupon${adminCoupons.length === 1 ? "" : "s"}`,
            ...adminCoupons.slice(0, 2).map((coupon) => `${coupon.code}: ${coupon.label}`),
          ]}
        />
        <AdminPanel
          icon={Users}
          title="Customers"
          items={[
            `${customers.length} customer profile${customers.length === 1 ? "" : "s"} from database`,
            `${customers.filter((customer) => customer.role === "admin").length} admin account${customers.filter((customer) => customer.role === "admin").length === 1 ? "" : "s"}`,
            `${customers.reduce((sum, customer) => sum + customer.loyaltyPoints, 0)} total loyalty points`,
          ]}
        />
        <AdminPanel
          icon={Star}
          title="Reviews"
          items={[
            `${highlightedReviews.length} review${highlightedReviews.length === 1 ? "" : "s"} from database`,
            highlightedReviews[0] ? `${highlightedReviews[0].rating}/5 for ${highlightedReviews[0].foodName}` : "No customer reviews yet",
            highlightedReviews[0]?.comment || "Reviews will appear after customers submit ratings",
          ]}
        />
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

function formatOrderTime(createdAt: string) {
  return new Intl.DateTimeFormat("en-NG", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(createdAt));
}

function formatWaitingTime(createdAt: string, now: number) {
  const elapsedSeconds = Math.max(0, Math.floor((now - new Date(createdAt).getTime()) / 1000));
  if (elapsedSeconds < 60) return `${elapsedSeconds} sec`;

  const elapsedMinutes = Math.floor(elapsedSeconds / 60);
  if (elapsedMinutes < 60) return `${elapsedMinutes} min`;

  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) return `${elapsedHours} hr`;

  const elapsedDays = Math.floor(elapsedHours / 24);
  return `${elapsedDays} day${elapsedDays === 1 ? "" : "s"}`;
}

function AddStaffModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (input: StaffInput) => Promise<void> }) {
  const [form, setForm] = useState<StaffInput>({ fullName: "", email: "", phone: "", role: "staff" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await onSubmit(form);
    } catch (staffError) {
      setError(staffError instanceof Error ? staffError.message : "Could not add staff member.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
      <Card className="w-full max-w-lg border-white/10 dark:bg-[#181818]">
        <CardContent className="p-5">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-savoury-primary">Team access</p>
              <h2 className="text-xl font-black">Add Staff</h2>
            </div>
            <button className="rounded-full p-2 text-zinc-500 transition hover:bg-zinc-100 dark:hover:bg-white/10" onClick={onClose} aria-label="Close add staff modal">
              <X className="h-5 w-5" />
            </button>
          </div>
          <form className="grid gap-3" onSubmit={submit}>
            <Input required placeholder="Full name" value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} />
            <Input required type="email" placeholder="Email address" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
            <Input placeholder="Phone number" value={form.phone || ""} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
            <select
              className="h-12 rounded-xl border border-white/10 bg-[#101010] px-4 text-sm font-bold text-white outline-none focus:border-savoury-primary focus:ring-4 focus:ring-[#1f2a12]"
              value={form.role}
              onChange={(event) => setForm({ ...form, role: event.target.value as StaffInput["role"] })}
            >
              <option value="staff">Staff</option>
              <option value="manager">Manager</option>
              <option value="kitchen">Kitchen</option>
              <option value="delivery">Delivery</option>
              <option value="admin">Admin</option>
            </select>
            {error && <p className="rounded-xl bg-red-500/10 p-3 text-sm font-bold text-red-500">{error}</p>}
            <div className="mt-2 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button disabled={saving}>{saving ? "Adding..." : "Add Staff"}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function getRevenueForDays(orders: StoredOrder[], days: number) {
  const since = Date.now() - days * 24 * 60 * 60 * 1000;
  return orders
    .filter((order) => new Date(order.createdAt).getTime() >= since)
    .reduce((sum, order) => sum + order.total, 0);
}

function getTopFoodCounts(orders: StoredOrder[]) {
  const counts = new Map<string, number>();
  orders.forEach((order) => {
    order.items.forEach((item) => {
      counts.set(item.food.name, (counts.get(item.food.name) || 0) + item.quantity);
    });
  });
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
}

function getPopularCategoryCounts(orders: StoredOrder[]) {
  const counts = new Map<string, number>();
  orders.forEach((order) => {
    order.items.forEach((item) => {
      counts.set(item.food.category, (counts.get(item.food.category) || 0) + item.quantity);
    });
  });
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
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

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-zinc-200 p-4 text-sm font-bold text-zinc-500 dark:border-white/10">
      {text}
    </div>
  );
}
