import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export type KitchenOrderStatus = "received" | "preparing" | "ready";
export type KitchenOrderSource = "app" | "pos";

export interface KitchenOrder {
  id: string;
  number: string;
  source: KitchenOrderSource;
  status: KitchenOrderStatus;
  orderType: string;
  customerName: string;
  instructions?: string;
  items: Array<{ name: string; quantity: number }>;
  createdAt: string;
}

export interface KitchenStaff {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  staffId: string;
  status: "active" | "suspended";
  mustChangePassword: boolean;
  createdAt: string;
  lastLoginAt?: string;
  temporaryPassword?: string;
}

export async function fetchKitchenOrders(): Promise<KitchenOrder[]> {
  if (!isSupabaseConfigured || !supabase) return [];
  const [appResult, posResult] = await Promise.all([
    supabase.from("orders").select("id, status, delivery_mode, customer_name, special_instructions, created_at, order_items(quantity, foods(name))").in("status", ["received", "preparing", "ready"]).order("created_at"),
    supabase.from("pos_orders").select("id, receipt_number, fulfillment_status, order_type, customer_name, created_at, pos_order_items(food_name, quantity)").in("fulfillment_status", ["received", "preparing", "ready"]).order("created_at"),
  ]);
  if (appResult.error) throw appResult.error;
  if (posResult.error) throw posResult.error;

  const appOrders: KitchenOrder[] = (appResult.data || []).map((order: any) => ({
    id: order.id,
    number: `APP-${order.id.slice(0, 8).toUpperCase()}`,
    source: "app",
    status: order.status,
    orderType: order.delivery_mode,
    customerName: order.customer_name || "App customer",
    instructions: order.special_instructions || undefined,
    createdAt: order.created_at,
    items: (order.order_items || []).map((item: any) => ({
      name: (Array.isArray(item.foods) ? item.foods[0] : item.foods)?.name || "Menu item",
      quantity: Number(item.quantity || 0),
    })),
  }));
  const posOrders: KitchenOrder[] = (posResult.data || []).map((order: any) => ({
    id: order.id,
    number: order.receipt_number,
    source: "pos",
    status: order.fulfillment_status,
    orderType: order.order_type,
    customerName: order.customer_name || "Walk-in customer",
    createdAt: order.created_at,
    items: (order.pos_order_items || []).map((item: any) => ({ name: item.food_name, quantity: Number(item.quantity || 0) })),
  }));
  return [...appOrders, ...posOrders].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

export async function updateKitchenOrderStatus(order: KitchenOrder, status: Exclude<KitchenOrderStatus, "received">) {
  if (!isSupabaseConfigured || !supabase) throw new Error("Supabase is not configured.");
  const { error } = await supabase.rpc("update_kitchen_order_status", {
    order_source: order.source,
    target_order_id: order.id,
    next_status: status,
  });
  if (error) throw error;
}

export async function fetchKitchenStaff(): Promise<KitchenStaff[]> {
  if (!isSupabaseConfigured || !supabase) return [];
  const { data, error } = await supabase.from("kitchen_staff").select("id, full_name, email, phone, staff_id, status, must_change_password, created_at, last_login_at").order("created_at", { ascending: false });
  if (error) throw error;
  return data.map((staff: any) => ({ id: staff.id, fullName: staff.full_name, email: staff.email, phone: staff.phone || undefined, staffId: staff.staff_id, status: staff.status, mustChangePassword: staff.must_change_password, createdAt: staff.created_at, lastLoginAt: staff.last_login_at || undefined }));
}

export async function saveKitchenStaff(input: { fullName: string; email: string; phone?: string; status: "active" | "suspended" }) {
  if (!isSupabaseConfigured || !supabase) throw new Error("Supabase is required to create kitchen staff accounts.");
  const { data, error } = await supabase.functions.invoke("manage-kitchen-staff", { body: { action: "upsert", ...input } });
  if (error || data?.error) throw new Error(data?.error || error?.message || "Could not create the kitchen account.");
  return { ...data.staff, temporaryPassword: data.temporaryPassword } as KitchenStaff;
}

export async function resetKitchenPassword(email: string) {
  if (!isSupabaseConfigured || !supabase) throw new Error("Supabase is required.");
  const { data, error } = await supabase.functions.invoke("manage-kitchen-staff", { body: { action: "reset_password", email } });
  if (error || data?.error) throw new Error(data?.error || error?.message || "Could not reset the kitchen password.");
  return data.temporaryPassword as string;
}
