import { mockOrders } from "@/data/catalog";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import type { CartItem, DeliveryMode, Order, PaymentMethod } from "@/types";

export type AdminOrderStatus = "pending" | "preparing" | "ready" | "out_for_delivery" | "delivered" | "rejected";
export type StoredOrder = Omit<Order, "status" | "paymentMethod"> & {
  status: AdminOrderStatus;
  paymentMethod: PaymentMethod | "split";
  instructions?: string;
  source?: "app" | "pos";
  receiptNumber?: string;
};

const ordersKey = "savoury-submitted-orders";

type DbOrderStatus = "received" | "preparing" | "cooking" | "ready" | "out_for_delivery" | "delivered" | "rejected" | "completed" | "cancelled";

function toAppStatus(status: DbOrderStatus | string): AdminOrderStatus {
  if (status === "received") return "pending";
  if (status === "cooking") return "preparing";
  if (status === "rejected" || status === "cancelled") return "rejected";
  if (status === "completed") return "delivered";
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
    .map((order) => ({ ...order, source: "app", status: "pending" }));
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
    source: "app",
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

export async function fetchAdminOrders(userId?: string): Promise<StoredOrder[]> {
  if (!isSupabaseConfigured || !supabase) return getAdminOrders();

  let query = supabase
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
          stock_quantity,
          is_special,
          is_recommended,
          categories (name)
        )
      )
    `)
    .order("created_at", { ascending: false });

  if (userId) {
    query = query.eq("user_id", userId);
  }

  const { data, error } = await query;

  if (error || !data) {
    console.warn("Could not load Supabase orders. Falling back to local orders.", error);
    return getAdminOrders();
  }

  const appOrders = data.map((order) => ({
    id: order.id,
    source: "app" as const,
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
          stockQuantity: Number(food?.stock_quantity ?? 0),
        },
      };
    }),
  })) as StoredOrder[];

  if (userId) return appOrders;

  const { data: posData, error: posError } = await supabase
    .from("pos_orders")
    .select(`
      id,
      receipt_number,
      customer_name,
      customer_phone,
      delivery_address,
      order_type,
      fulfillment_status,
      total,
      created_at,
      pos_payments (method),
      pos_order_items (
        food_id,
        food_name,
        quantity,
        unit_price,
        foods (
          id,
          name,
          slug,
          description,
          image_url,
          ingredients,
          calories,
          preparation_time,
          rating,
          popularity,
          stock_quantity,
          is_special,
          is_recommended,
          categories (name)
        )
      )
    `)
    .eq("order_type", "delivery")
    .order("created_at", { ascending: false });

  if (posError || !posData) {
    console.warn("Could not load POS delivery orders. Run supabase/pos-delivery-flow-patch.sql once.", posError);
    return appOrders;
  }

  const posOrders = posData.map((order: any) => ({
    id: order.id,
    source: "pos" as const,
    receiptNumber: order.receipt_number,
    customerName: order.customer_name || "Walk-in customer",
    phone: order.customer_phone || "Not provided",
    address: order.delivery_address || "Delivery address not provided",
    status: toAppStatus(order.fulfillment_status),
    paymentMethod: (order.pos_payments?.[0]?.method || "card") as PaymentMethod | "split",
    deliveryMode: "delivery" as DeliveryMode,
    total: Number(order.total || 0),
    createdAt: order.created_at,
    items: (order.pos_order_items || []).map((item: any) => {
      const food = Array.isArray(item.foods) ? item.foods[0] : item.foods;
      return {
        quantity: Number(item.quantity || 0),
        food: {
          id: food?.id || item.food_id || `${order.id}-${item.food_name}`,
          name: food?.name || item.food_name || "Savoury Meal",
          slug: food?.slug || `pos-${item.food_id || order.id}`,
          category: food?.categories?.name || "POS",
          description: food?.description || "Prepared at the Savoury counter.",
          price: Number(item.unit_price || 0),
          image: food?.image_url || "/images/savoury-reference-hero.jpg",
          ingredients: food?.ingredients || [],
          calories: food?.calories || 0,
          prepTime: food?.preparation_time || 25,
          rating: Number(food?.rating || 4.8),
          reviews: food?.popularity || 0,
          popularity: food?.popularity || 0,
          tags: [food?.categories?.name || "POS"],
          isSpecial: food?.is_special,
          isRecommended: food?.is_recommended,
          stockQuantity: Number(food?.stock_quantity ?? 0),
        },
      };
    }),
  })) as StoredOrder[];

  return [...appOrders, ...posOrders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
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
    const { error: stockError } = await supabase.rpc("reserve_food_stock", {
      items: payload.items.map((item) => ({ food_id: item.food.id, quantity: item.quantity })),
    });

    if (stockError) {
      throw new Error(stockError.message || "One or more items are out of stock.");
    }

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
    const isPosOrder = fallbackOrder?.source === "pos";
    const posStatus = status === "pending" ? "received" : status === "rejected" ? "cancelled" : status;
    const { error } = isPosOrder
      ? await supabase.from("pos_orders").update({ fulfillment_status: posStatus }).eq("id", orderId)
      : await supabase.from("orders").update({ status: toDbStatus(status) }).eq("id", orderId);
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
