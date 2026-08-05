import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { Activity, ArrowRight, BarChart3, CheckCircle2, Clock, ListChecks, PackagePlus, Star, Users, XCircle, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { categories } from "@/data/catalog";
import { formatCurrency } from "@/lib/utils";
import {
  activateAdminSalesRepresentative,
  adminDashboardKeys,
  fetchAdminActivityEvents,
  fetchAdminCoupons,
  fetchAdminCustomers,
  fetchAdminReviews,
  fetchAdminSalesRepresentatives,
  fetchAdminUserSessions,
  saveAdminSalesRepresentative,
  suspendAdminSalesRepresentative,
} from "@/services/adminDashboardService";
import { fetchCategories, foodKeys } from "@/services/foodService";
import { fetchAdminOrders, getAdminOrders, updateStoredOrderStatus, type AdminOrderStatus, type StoredOrder } from "@/services/orderStorage";
import { resetSalesRepresentativePassword, type SalesRepresentative } from "@/services/posService";
import { fetchKitchenStaff, resetKitchenPassword, saveKitchenStaff, type KitchenStaff } from "@/services/kitchenService";

const orderStatusOptions: AdminOrderStatus[] = ["preparing", "ready", "out_for_delivery", "delivered"];

function availableOrderStatuses(order: StoredOrder): AdminOrderStatus[] {
  if (order.source !== "pos") return orderStatusOptions;
  if (order.status === "ready") return ["ready", "out_for_delivery"];
  if (order.status === "out_for_delivery") return ["out_for_delivery", "delivered"];
  return [];
}

export function AdminDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: menuCategories = categories } = useQuery({ queryKey: foodKeys.categories, queryFn: fetchCategories });
  const { data: customers = [] } = useQuery({ queryKey: adminDashboardKeys.customers, queryFn: fetchAdminCustomers });
  const { data: userSessions = [] } = useQuery({ queryKey: adminDashboardKeys.sessions, queryFn: fetchAdminUserSessions, refetchInterval: 30000 });
  const { data: activityFeed = [] } = useQuery({ queryKey: adminDashboardKeys.activity, queryFn: () => fetchAdminActivityEvents(), refetchInterval: 30000 });
  const { data: highlightedReviews = [] } = useQuery({ queryKey: adminDashboardKeys.reviews, queryFn: fetchAdminReviews });
  const { data: adminCoupons = [] } = useQuery({ queryKey: adminDashboardKeys.coupons, queryFn: fetchAdminCoupons });
  const { data: salesReps = [] } = useQuery({ queryKey: adminDashboardKeys.salesReps, queryFn: fetchAdminSalesRepresentatives });
  const { data: kitchenStaff = [] } = useQuery({ queryKey: ["admin-kitchen-staff"], queryFn: fetchKitchenStaff });

  const [orders, setOrders] = useState<StoredOrder[]>(() => getAdminOrders());
  const [orderSearch, setOrderSearch] = useState("");
  const [feedback, setFeedback] = useState("Ready to manage today's operations.");
  const [now, setNow] = useState(() => Date.now());
  const [repForm, setRepForm] = useState({ fullName: "", email: "", phone: "" });
  const [kitchenForm, setKitchenForm] = useState({ fullName: "", email: "", phone: "" });
  const [accessCredentials, setAccessCredentials] = useState<{ email: string; password: string; title: string } | null>(null);

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
    const refreshTimer = window.setInterval(refreshOrders, 10000);
    window.addEventListener("savoury-orders-updated", refreshOrders);
    window.addEventListener("storage", refreshOrders);
    return () => {
      mounted = false;
      window.clearInterval(refreshTimer);
      window.removeEventListener("savoury-orders-updated", refreshOrders);
      window.removeEventListener("storage", refreshOrders);
    };
  }, []);

  const filteredOrders = useMemo(() => {
    const query = orderSearch.trim().toLowerCase();
    if (!query) return orders;
    return orders.filter((order) =>
      [order.id, order.receiptNumber || "", order.customerName, order.phone, order.status].some((value) => value.toLowerCase().includes(query))
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

  const saveRep = async () => {
    if (!repForm.fullName.trim() || !repForm.email.trim()) {
      setFeedback("Provide sales representative name and email.");
      return;
    }
    try {
      const saved = await saveAdminSalesRepresentative({
        fullName: repForm.fullName,
        email: repForm.email,
        phone: repForm.phone || undefined,
        status: "active",
        permissions: ["discounts", "reports"],
      });
      await queryClient.invalidateQueries({ queryKey: adminDashboardKeys.salesReps });
      setRepForm({ fullName: "", email: "", phone: "" });
      if (saved.temporaryPassword) {
        setAccessCredentials({ email: saved.email, password: saved.temporaryPassword, title: "POS account created" });
        setFeedback("Sales Representative login created successfully.");
      } else {
        setFeedback("Sales Representative updated. Use Reset Password to issue new login credentials.");
      }
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Could not create the Sales Representative login.");
    }
  };

  const resetRepPassword = async (rep: SalesRepresentative) => {
    try {
      const password = await resetSalesRepresentativePassword(rep.email);
      if (!password) throw new Error("The password service returned no temporary password.");
      setAccessCredentials({ email: rep.email, password, title: "POS password reset" });
      setFeedback("A new temporary POS password has been generated.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Could not reset sales representative password.");
    }
  };

  const toggleRep = async (rep: SalesRepresentative) => {
    if (rep.status === "active") {
      await suspendAdminSalesRepresentative(rep);
      await queryClient.invalidateQueries({ queryKey: adminDashboardKeys.salesReps });
      setFeedback(`${rep.fullName} has been suspended.`);
    } else {
      await activateAdminSalesRepresentative(rep);
      await queryClient.invalidateQueries({ queryKey: adminDashboardKeys.salesReps });
      setFeedback(`${rep.fullName} has been reactivated.`);
    }
  };

  const createKitchenStaff = async () => {
    if (!kitchenForm.fullName.trim() || !kitchenForm.email.trim()) {
      setFeedback("Provide kitchen staff name and email.");
      return;
    }
    try {
      const saved = await saveKitchenStaff({ ...kitchenForm, phone: kitchenForm.phone || undefined, status: "active" });
      await queryClient.invalidateQueries({ queryKey: ["admin-kitchen-staff"] });
      setKitchenForm({ fullName: "", email: "", phone: "" });
      if (saved.temporaryPassword) setAccessCredentials({ email: saved.email, password: saved.temporaryPassword, title: "Kitchen account created" });
      setFeedback(saved.temporaryPassword ? "Kitchen staff login created successfully." : "Kitchen staff profile updated. Reset the password to issue new credentials.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Could not create the kitchen account.");
    }
  };

  const toggleKitchenStaff = async (staff: KitchenStaff) => {
    try {
      await saveKitchenStaff({ fullName: staff.fullName, email: staff.email, phone: staff.phone, status: staff.status === "active" ? "suspended" : "active" });
      await queryClient.invalidateQueries({ queryKey: ["admin-kitchen-staff"] });
      setFeedback(`${staff.fullName} has been ${staff.status === "active" ? "suspended" : "activated"}.`);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Could not update kitchen staff.");
    }
  };

  const resetKitchenStaffPassword = async (staff: KitchenStaff) => {
    try {
      const password = await resetKitchenPassword(staff.email);
      setAccessCredentials({ email: staff.email, password, title: "Kitchen password reset" });
      setFeedback("A new temporary kitchen password has been generated.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Could not reset the kitchen password.");
    }
  };

  return (
    <main className="app-container py-6">
      {accessCredentials && (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-black/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={accessCredentials.title}>
          <Card className="w-full max-w-md border-savoury-primary/30 shadow-premium">
            <CardContent className="p-6">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-savoury-primary">Staff access</p>
              <h2 className="mt-2 text-2xl font-black">{accessCredentials.title}</h2>
              <p className="mt-2 text-sm font-semibold text-zinc-500">Give these temporary credentials securely to the staff member. They can sign in through the normal login page.</p>
              <div className="mt-5 grid gap-3">
                <div className="rounded-xl bg-zinc-100 p-4 dark:bg-white/10"><p className="text-xs font-black uppercase text-zinc-500">Email</p><p className="mt-1 break-all font-black">{accessCredentials.email}</p></div>
                <div className="rounded-xl bg-zinc-100 p-4 dark:bg-white/10"><p className="text-xs font-black uppercase text-zinc-500">Temporary password</p><p className="mt-1 break-all font-mono text-lg font-black">{accessCredentials.password}</p></div>
              </div>
              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                <Button variant="outline" onClick={() => navigator.clipboard.writeText(`Email: ${accessCredentials.email}\nPassword: ${accessCredentials.password}`)}>Copy credentials</Button>
                <Button onClick={() => setAccessCredentials(null)}>Done</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="font-black uppercase text-savoury-primary">Admin dashboard</p>
          <h1 className="section-title text-3xl md:text-4xl">Restaurant operations center</h1>
          <p className="mt-2 text-zinc-500">Manage orders, menu, categories, coupons, customers, reviews, images, and analytics.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="lg" className="text-base md:text-lg" onClick={() => navigate("/admin/menu")}><ListChecks className="h-5 w-5" /> Menu Manager</Button>
        </div>
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
                          {order.receiptNumber || order.id}
                        </Link>
                        {order.source === "pos" && <p className="mt-1 text-[10px] font-black uppercase text-zinc-400">POS delivery</p>}
                      </td>
                      <td>{order.customerName}<p className="text-xs text-zinc-500">{order.phone}</p></td>
                      <td><StatusPill status={order.status} source={order.source} /></td>
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
                        {availableOrderStatuses(order).length ? (
                          <select className="h-9 rounded-lg border border-zinc-200 bg-white px-2 text-xs font-bold dark:border-white/10 dark:bg-zinc-950" value={order.status} onChange={(event) => updateOrderStatus(order.id, event.target.value as AdminOrderStatus)}>
                            {availableOrderStatuses(order).map((status) => <option key={status} value={status}>{status.replace(/_/g, " ")}</option>)}
                          </select>
                        ) : (
                          <span className="text-xs font-bold text-zinc-400">{order.source === "pos" && ["pending", "preparing"].includes(order.status) ? "Kitchen processing" : "Hidden"}</span>
                        )}
                      </td>
                      <td>
                        <div className="flex gap-2">
                          {order.status === "pending" && order.source !== "pos" ? (
                            <>
                              <Button size="sm" variant="secondary" onClick={() => updateOrderStatus(order.id, "preparing")}><CheckCircle2 className="h-4 w-4" /> Accept</Button>
                              <Button size="sm" variant="outline" onClick={() => updateOrderStatus(order.id, "rejected")}><XCircle className="h-4 w-4" /> Reject</Button>
                            </>
                          ) : (
                            <span className="text-xs font-bold text-zinc-400">{order.status === "rejected" ? "Rejected" : order.source === "pos" ? "POS paid" : "Accepted"}</span>
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
              <div className="flex shrink-0 items-center gap-2">
                <Activity className="h-8 w-8 text-savoury-primary" />
                <Link to="/admin/activity"><Button size="sm" variant="outline">More Activity <ArrowRight className="h-4 w-4" /></Button></Link>
              </div>
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
            <div className="mb-4 flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
              <div>
                <h2 className="text-xl font-black">Sales Representatives</h2>
                <p className="mt-1 text-sm font-semibold text-zinc-500">Create POS profiles, suspend accounts, and review staff access.</p>
              </div>
              <div className="grid gap-2 md:grid-cols-4">
                <Input placeholder="Full name" value={repForm.fullName} onChange={(event) => setRepForm({ ...repForm, fullName: event.target.value })} />
                <Input type="email" placeholder="Email" value={repForm.email} onChange={(event) => setRepForm({ ...repForm, email: event.target.value })} />
                <Input placeholder="Phone" value={repForm.phone} onChange={(event) => setRepForm({ ...repForm, phone: event.target.value })} />
                <Button onClick={saveRep}>Create POS User</Button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="text-xs uppercase text-zinc-400">
                  <tr><th className="py-3">Staff</th><th>Email</th><th>Status</th><th>Permissions</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {salesReps.map((rep) => (
                    <tr key={rep.id} className="cursor-pointer border-t border-zinc-100 transition hover:bg-zinc-50 dark:border-white/10 dark:hover:bg-white/5" onClick={() => navigate(`/admin/sales-representatives/${rep.id}`)}>
                      <td className="py-4 font-black"><Link className="transition hover:text-savoury-primary hover:underline" to={`/admin/sales-representatives/${rep.id}`}>{rep.fullName}</Link><p className="text-xs text-zinc-500">{rep.staffId}</p></td>
                      <td>{rep.email}</td>
                      <td><span className={`rounded-full px-3 py-1 text-xs font-black capitalize ${rep.status === "active" ? "bg-savoury-accent text-savoury-primary dark:bg-savoury-primary/10" : "bg-red-500/10 text-red-500"}`}>{rep.status}</span></td>
                      <td className="capitalize">{rep.permissions.join(", ") || "POS only"}</td>
                      <td className="flex gap-2 py-3" onClick={(event) => event.stopPropagation()}>
                        <Button size="sm" variant="outline" onClick={() => toggleRep(rep)}>{rep.status === "active" ? "Suspend" : "Activate"}</Button>
                        <Button size="sm" variant="outline" onClick={() => resetRepPassword(rep)}>Reset Password</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!salesReps.length && <div className="mt-3"><EmptyState text="No sales representatives yet." /></div>}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="mt-6">
        <Card>
          <CardContent>
            <div className="mb-4 flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
              <div><h2 className="text-xl font-black">Kitchen Staff</h2><p className="mt-1 text-sm font-semibold text-zinc-500">Create and manage accounts that process app and counter orders.</p></div>
              <div className="grid gap-2 md:grid-cols-4">
                <Input placeholder="Full name" value={kitchenForm.fullName} onChange={(event) => setKitchenForm({ ...kitchenForm, fullName: event.target.value })} />
                <Input type="email" placeholder="Email" value={kitchenForm.email} onChange={(event) => setKitchenForm({ ...kitchenForm, email: event.target.value })} />
                <Input placeholder="Phone" value={kitchenForm.phone} onChange={(event) => setKitchenForm({ ...kitchenForm, phone: event.target.value })} />
                <Button onClick={createKitchenStaff}>Create Kitchen User</Button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-left text-sm">
                <thead className="text-xs uppercase text-zinc-400"><tr><th className="py-3">Staff</th><th>Email</th><th>Status</th><th>Password</th><th>Actions</th></tr></thead>
                <tbody>
                  {kitchenStaff.map((staff) => (
                    <tr key={staff.id} className="border-t border-zinc-100 dark:border-white/10">
                      <td className="py-4 font-black">{staff.fullName}<p className="text-xs text-zinc-500">{staff.staffId}</p></td>
                      <td>{staff.email}</td>
                      <td><span className={`rounded-full px-3 py-1 text-xs font-black capitalize ${staff.status === "active" ? "bg-savoury-primary/10 text-savoury-primary" : "bg-red-500/10 text-red-500"}`}>{staff.status}</span></td>
                      <td>{staff.mustChangePassword ? "Change required" : "Private password set"}</td>
                      <td className="flex gap-2 py-3"><Button size="sm" variant="outline" onClick={() => toggleKitchenStaff(staff)}>{staff.status === "active" ? "Suspend" : "Activate"}</Button><Button size="sm" variant="outline" onClick={() => resetKitchenStaffPassword(staff)}>Reset Password</Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!kitchenStaff.length && <div className="mt-3"><EmptyState text="No kitchen staff accounts yet." /></div>}
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

function StatusPill({ status, source }: { status: AdminOrderStatus; source?: StoredOrder["source"] }) {
  if (status === "pending") {
    return <span className="text-xs font-bold text-zinc-400">{source === "pos" ? "Kitchen queue" : "Awaiting approval"}</span>;
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
