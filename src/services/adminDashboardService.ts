import { coupons as fallbackCoupons, reviews as fallbackReviews } from "@/data/catalog";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { formatCurrency } from "@/lib/utils";
import { fetchCoupons } from "@/services/foodService";
import { fetchSalesRepresentatives, saveSalesRepresentative, type SalesRepresentative } from "@/services/posService";
import type { Coupon, Review } from "@/types";

export interface AdminCustomer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  loyaltyPoints: number;
  joinedAt: string;
}

export interface AdminUserSession {
  id: string;
  name: string;
  email: string;
  status: "online" | "away" | "offline";
  lastSeenAt: string;
  cartItems: number;
  currentPage: string;
}

export interface AdminActivityEvent {
  id: string;
  user: string;
  action: string;
  page?: string;
  createdAt: string;
}

export interface AdminReview {
  id: string;
  foodName: string;
  customer: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface AdminPosSale {
  id: string;
  receiptNumber: string;
  customerName?: string;
  orderType: string;
  paymentMethod: string;
  status: string;
  total: number;
  createdAt: string;
}

export interface AdminSalesRepActivity {
  representative: SalesRepresentative;
  sales: AdminPosSale[];
  events: Array<{ id: string; action: string; details?: string; createdAt: string }>;
  totalRevenue: number;
  todayRevenue: number;
  averageSale: number;
}

export const adminDashboardKeys = {
  customers: ["admin-customers"] as const,
  sessions: ["admin-user-sessions"] as const,
  activity: ["admin-activity-events"] as const,
  reviews: ["admin-reviews"] as const,
  coupons: ["admin-coupons"] as const,
  salesReps: ["admin-sales-representatives"] as const,
};

export async function fetchAdminCustomers(): Promise<AdminCustomer[]> {
  if (!isSupabaseConfigured || !supabase) {
    return [
      { id: "demo-1", name: "Demo Customer", email: "customer@savoury.local", role: "customer", loyaltyPoints: 250, joinedAt: new Date().toISOString() },
    ];
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, phone, loyalty_points, created_at, users(email, role)")
    .order("created_at", { ascending: false });

  if (error) {
    console.warn("Could not load admin customers.", error);
    return [];
  }

  return data.map((profile: any) => {
    const user = Array.isArray(profile.users) ? profile.users[0] : profile.users;
    return {
      id: profile.id,
      name: profile.full_name || "Savoury Customer",
      email: user?.email || "No email",
      phone: profile.phone || undefined,
      role: user?.role || "customer",
      loyaltyPoints: Number(profile.loyalty_points || 0),
      joinedAt: profile.created_at,
    };
  });
}

export async function fetchAdminUserSessions(): Promise<AdminUserSession[]> {
  if (!isSupabaseConfigured || !supabase) return [];
  const { data, error } = await supabase
    .from("user_sessions")
    .select("id, display_name, email, status, current_page, cart_items, last_seen_at")
    .order("last_seen_at", { ascending: false })
    .limit(25);

  if (error) {
    console.warn("Could not load user sessions. Run supabase/admin-dashboard-live-data-patch.sql once.", error);
    return [];
  }

  return data.map((session: any) => ({
    id: session.id,
    name: session.display_name || "Savoury Customer",
    email: session.email || "No email",
    status: session.status,
    currentPage: session.current_page || "Unknown",
    cartItems: Number(session.cart_items || 0),
    lastSeenAt: session.last_seen_at,
  }));
}

export async function fetchAdminActivityEvents(): Promise<AdminActivityEvent[]> {
  if (!isSupabaseConfigured || !supabase) return [];
  const { data, error } = await supabase
    .from("activity_events")
    .select("id, display_name, action, page, created_at")
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) {
    console.warn("Could not load activity events. Run supabase/admin-dashboard-live-data-patch.sql once.", error);
    return [];
  }

  return data.map((event: any) => ({
    id: event.id,
    user: event.display_name || "Savoury Customer",
    action: event.action,
    page: event.page || undefined,
    createdAt: event.created_at,
  }));
}

export async function fetchAdminReviews(): Promise<AdminReview[]> {
  if (!isSupabaseConfigured || !supabase) {
    return fallbackReviews.map((review: Review) => ({
      id: review.id,
      foodName: review.foodId,
      customer: review.user,
      rating: review.rating,
      comment: review.comment,
      createdAt: review.createdAt,
    }));
  }

  const { data, error } = await supabase
    .from("reviews")
    .select("id, user_id, rating, comment, created_at, foods(name)")
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    console.warn("Could not load admin reviews.", error);
    return [];
  }

  return data.map((review: any) => {
    const food = Array.isArray(review.foods) ? review.foods[0] : review.foods;
    return {
      id: review.id,
      foodName: food?.name || "Menu item",
      customer: "Verified customer",
      rating: Number(review.rating || 0),
      comment: review.comment,
      createdAt: review.created_at,
    };
  });
}

export async function fetchAdminCoupons(): Promise<Coupon[]> {
  try {
    return await fetchCoupons();
  } catch {
    return fallbackCoupons;
  }
}

export async function fetchAdminSalesRepresentatives() {
  return fetchSalesRepresentatives();
}

export async function saveAdminSalesRepresentative(rep: Parameters<typeof saveSalesRepresentative>[0]) {
  return saveSalesRepresentative(rep);
}

export async function suspendAdminSalesRepresentative(rep: SalesRepresentative) {
  return saveSalesRepresentative({ ...rep, status: "suspended" });
}

export async function activateAdminSalesRepresentative(rep: SalesRepresentative) {
  return saveSalesRepresentative({ ...rep, status: "active" });
}

export async function fetchAdminSalesRepresentativeActivity(repId: string): Promise<AdminSalesRepActivity | null> {
  if (!isSupabaseConfigured || !supabase) {
    const representative = (await fetchSalesRepresentatives()).find((rep) => rep.id === repId);
    return representative ? { representative, sales: [], events: [], totalRevenue: 0, todayRevenue: 0, averageSale: 0 } : null;
  }

  const { data: rep, error: repError } = await supabase
    .from("sales_representatives")
    .select("id, auth_user_id, full_name, email, phone, staff_id, status, permissions, must_change_password, created_at, last_login_at")
    .eq("id", repId)
    .maybeSingle();
  if (repError) throw repError;
  if (!rep) return null;

  const [ordersResult, logsResult] = await Promise.all([
    supabase
      .from("pos_orders")
      .select("id, receipt_number, customer_name, order_type, status, total, created_at, pos_payments(method)")
      .eq("cashier_id", rep.auth_user_id)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("pos_transaction_logs")
      .select("id, action, metadata, created_at")
      .eq("actor_id", rep.auth_user_id)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);
  if (ordersResult.error) throw ordersResult.error;
  if (logsResult.error) throw logsResult.error;

  const representative: SalesRepresentative = {
    id: rep.id,
    fullName: rep.full_name,
    email: rep.email,
    phone: rep.phone || undefined,
    staffId: rep.staff_id,
    status: rep.status,
    permissions: rep.permissions || [],
    mustChangePassword: rep.must_change_password === true,
    createdAt: rep.created_at,
    lastLoginAt: rep.last_login_at || undefined,
  };

  const sales: AdminPosSale[] = (ordersResult.data || []).map((order: any) => {
    const payment = Array.isArray(order.pos_payments) ? order.pos_payments[0] : order.pos_payments;
    return {
      id: order.id,
      receiptNumber: order.receipt_number,
      customerName: order.customer_name || undefined,
      orderType: order.order_type,
      paymentMethod: payment?.method || "unrecorded",
      status: order.status,
      total: Number(order.total || 0),
      createdAt: order.created_at,
    };
  });

  const events = (logsResult.data || []).map((event: any) => ({
    id: event.id,
    action: event.action,
    details: event.metadata?.receipt_number
      ? `${event.metadata.receipt_number} · ${formatCurrency(Number(event.metadata.total || 0))}`
      : undefined,
    createdAt: event.created_at,
  }));
  const validSales = sales.filter((sale) => sale.status !== "cancelled" && sale.status !== "refunded");
  const startToday = new Date();
  startToday.setHours(0, 0, 0, 0);
  const totalRevenue = validSales.reduce((sum, sale) => sum + sale.total, 0);
  const todayRevenue = validSales.filter((sale) => new Date(sale.createdAt) >= startToday).reduce((sum, sale) => sum + sale.total, 0);

  return {
    representative,
    sales,
    events,
    totalRevenue,
    todayRevenue,
    averageSale: validSales.length ? totalRevenue / validSales.length : 0,
  };
}
