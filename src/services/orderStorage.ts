import { mockOrders } from "@/data/catalog";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import type { CartItem, DeliveryMode, Order, PaymentMethod } from "@/types";

export type AdminOrderStatus = "pending" | "preparing" | "ready" | "out_for_delivery" | "delivered" | "rejected";
export type StoredOrder = Omit<Order, "status"> & {
  status: AdminOrderStatus;
  instructions?: string;
};

const ordersKey = "savoury-submitted-orders";

type DbOrderStatus = "received" | "preparing" | "cooking" | "ready" | "out_for_delivery" | "delivered" | "rejected";

function toAppStatus(status: DbOrderStatus | string): AdminOrderStatus {
  if (status === "received") return "pending";
  if (status === "cooking") return "preparing";
  if (status === "rejected") return "rejected";
  if (status === "ready" || status === "out_for_delivery" || status === "delivered" || status === "preparing") return status;
  return "pending";
}

function toDbStatus(status: AdminOrderStatus): DbOrderStatus {
  if (status === "pending") return "received";
  return status;
}

function publishOrdersUpdated() {
  window.dispatchEvent(new Event("savoury-orders-updated"));
}

function saveOrders(orders: StoredOrder[]) {
  localStorage.setItem(ordersKey, JSON.stringify(orders));
  publishOrdersUpdated();
}

export function getStoredOrders(): StoredOrder[] {
  try {
    return JSON.parse(localStorage.getItem(ordersKey) || "[]") as StoredOrder[];
  } catch {
    return [];
  }
}

export function getAdminOrders(): StoredOrder[] {
  const submitted = getStoredOrders();
  const submittedIds = new Set(submitted.map((order) => order.id));
  const demoOrders: StoredOrder[] = mockOrders
    .filter((order) => !submittedIds.has(order.id))
    .map((order) => ({ ...order, status: "pending" }));
  return [...submitted, ...demoOrders];
}

function getLocalOrder(payload: {
  customerName: string;
  phone: string;
  address: string;
  items: CartItem[];
  paymentMethod: PaymentMethod;
  deliveryMode: DeliveryMode;
  total: number;
  instructions?: string;
}): StoredOrder {
  return {
    id: `SV-${Date.now().toString().slice(-6)}`,
    customerName: payload.customerName,
    phone: payload.phone,
    address: payload.address,
    items: payload.items,
    status: "pending",
    paymentMethod: payload.paymentMethod,
    deliveryMode: payload.deliveryMode,
    total: payload.total,
    createdAt: new Date().toISOString(),
    instructions: payload.instructions,
  };
}

export async function fetchAdminOrders(): Promise<StoredOrder[]> {
  if (!isSupabaseConfigured || !supabase) return getAdminOrders();

  const { data, error } = await supabase
    .from("orders")
    .select(`
      id,
      user_id,
      status,
      delivery_mode,
      subtotal,
      delivery_fee,
      tax,
      discount,
      total,
      special_instructions,
      created_at,
      customer_name,
      customer_phone,
      delivery_address,
      payment_method,
      order_items (
        quantity,
        unit_price,
        foods (
          id,
          name,
          slug,
          description,
          price,
          image_url,
          ingredients,
          calories,
          preparation_time,
          rating,
          popularity,
          is_special,
          is_recommended,
          categories (name)
        )
      )
    `)
    .order("created_at", { ascending: false });

  if (error || !data) {
    console.warn("Could not load Supabase orders. Falling back to local orders.", error);
    return getAdminOrders();
  }

  return data.map((order) => ({
    id: order.id,
    customerName: order.customer_name || "Savoury Customer",
    phone: order.customer_phone || "Not provided",
    address: order.delivery_address || "Pickup / address not provided",
    status: toAppStatus(order.status),
    paymentMethod: (order.payment_method || "card") as PaymentMethod,
    deliveryMode: order.delivery_mode as DeliveryMode,
    total: Number(order.total || 0),
    createdAt: order.created_at,
    instructions: order.special_instructions || undefined,
    items: (order.order_items || []).map((item: any) => {
      const food = Array.isArray(item.foods) ? item.foods[0] : item.foods;
      return {
        quantity: item.quantity,
        food: {
          id: food?.id || `${order.id}-${item.unit_price}`,
          name: food?.name || "Savoury Meal",
          slug: food?.slug || "savoury-meal",
          category: food?.categories?.name || "Rice",
          description: food?.description || "Freshly prepared meal.",
          price: Number(item.unit_price || food?.price || 0),
          image: food?.image_url || "/images/savoury-reference-hero.jpg",
          ingredients: food?.ingredients || [],
          calories: food?.calories || 0,
          prepTime: food?.preparation_time || 25,
          rating: Number(food?.rating || 4.8),
          reviews: food?.popularity || 0,
          popularity: food?.popularity || 0,
          tags: [food?.categories?.name || "Rice"],
          isSpecial: food?.is_special,
          isRecommended: food?.is_recommended,
        },
      };
    }),
  })) as StoredOrder[];
}

export async function saveSubmittedOrder(payload: {
  customerName: string;
  phone: string;
  address: string;
  items: CartItem[];
  paymentMethod: PaymentMethod;
  deliveryMode: DeliveryMode;
  total: number;
  subtotal?: number;
  deliveryFee?: number;
  tax?: number;
  instructions?: string;
  userId?: string;
}) {
  const order = getLocalOrder(payload);

  if (isSupabaseConfigured && supabase && payload.userId) {
    const { data: createdOrder, error: orderError } = await supabase
      .from("orders")
      .insert({
        user_id: payload.userId,
        status: "received",
        delivery_mode: payload.deliveryMode,
        subtotal: payload.subtotal ?? payload.items.reduce((sum, item) => sum + item.food.price * item.quantity, 0),
        delivery_fee: payload.deliveryFee ?? 0,
        tax: payload.tax ?? 0,
        discount: 0,
        total: payload.total,
        special_instructions: payload.instructions || null,
        customer_name: payload.customerName,
        customer_phone: payload.phone,
        delivery_address: payload.address,
        payment_method: payload.paymentMethod,
      })
      .select("id, status, created_at")
      .single();

    if (orderError) {
      console.warn("Could not save order to Supabase. Saving locally instead.", orderError);
    } else if (createdOrder) {
      const orderItems = payload.items.map((item) => ({
        order_id: createdOrder.id,
        food_id: item.food.id,
        quantity: item.quantity,
        unit_price: item.food.price,
      }));

      const { error: itemsError } = await supabase.from("order_items").insert(orderItems);
      if (itemsError) {
        console.warn("Could not save order items to Supabase.", itemsError);
      }

      const storedOrder: StoredOrder = {
        ...order,
        id: createdOrder.id,
        status: toAppStatus(createdOrder.status),
        createdAt: createdOrder.created_at,
      };
      saveOrders([storedOrder, ...getStoredOrders().filter((item) => item.id !== storedOrder.id)]);
      return storedOrder;
    }
  }

  saveOrders([order, ...getStoredOrders()]);
  return order;
}

export async function updateStoredOrderStatus(orderId: string, status: AdminOrderStatus, fallbackOrder?: StoredOrder) {
  if (isSupabaseConfigured && supabase && !orderId.startsWith("SV-")) {
    const { error } = await supabase.from("orders").update({ status: toDbStatus(status) }).eq("id", orderId);
    if (error) {
      console.warn("Could not update Supabase order status. Updating locally instead.", error);
    }
  }

  const storedOrders = getStoredOrders();
  const exists = storedOrders.some((order) => order.id === orderId);
  const updatedOrder = fallbackOrder ? { ...fallbackOrder, status } : undefined;
  const updated = exists
    ? storedOrders.map((order) => (order.id === orderId ? { ...order, status } : order))
    : updatedOrder
      ? [updatedOrder, ...storedOrders]
      : storedOrders;

  saveOrders(updated);
}
