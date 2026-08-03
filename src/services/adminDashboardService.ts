import { coupons as fallbackCoupons, reviews as fallbackReviews } from "@/data/catalog";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
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
