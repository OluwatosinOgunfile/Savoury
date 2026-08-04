import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import type { CartItem, Food, PaymentMethod } from "@/types";

export type PosOrderType = "dine_in" | "takeaway" | "delivery";
export type PosPaymentMethod = PaymentMethod | "split";
export type SalesRepPermission = "refunds" | "discounts" | "reports";

export interface SalesRepresentative {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  staffId: string;
  status: "active" | "suspended";
  permissions: SalesRepPermission[];
  mustChangePassword?: boolean;
  createdAt: string;
  lastLoginAt?: string;
  temporaryPassword?: string;
}

export interface PosPayment {
  method: PosPaymentMethod;
  amountPaid: number;
  change: number;
  split?: Array<{ method: PaymentMethod; amount: number }>;
}

export interface PosReceipt {
  id: string;
  receiptNumber: string;
  cashierId?: string;
  cashierName: string;
  customerName?: string;
  phone?: string;
  tableNumber?: string;
  orderType: PosOrderType;
  items: CartItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  payment: PosPayment;
  createdAt: string;
  synced: boolean;
  refunded?: boolean;
}

export interface HeldPosOrder {
  id: string;
  label: string;
  items: CartItem[];
  customerName?: string;
  phone?: string;
  tableNumber?: string;
  orderType: PosOrderType;
  discount: number;
  createdAt: string;
}

export interface PosSalesSummary {
  salesToday: number;
  revenueToday: number;
  weeklySales: number;
  monthlySales: number;
  transactions: number;
  averageOrderValue: number;
  paymentBreakdown: Record<PaymentMethod, number>;
  mostSoldFoods: Array<{ name: string; quantity: number }>;
}

const receiptsKey = "savoury-pos-receipts";
const heldOrdersKey = "savoury-pos-held-orders";
const salesRepKey = "savoury-sales-representatives";
const lastReceiptKey = "savoury-pos-last-receipt";

function readLocal<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(localStorage.getItem(key) || "") as T;
  } catch {
    return fallback;
  }
}

function writeLocal<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function getLocalReceipts(): PosReceipt[] {
  return readLocal<PosReceipt[]>(receiptsKey, []);
}

export function saveLocalReceipts(receipts: PosReceipt[]) {
  writeLocal(receiptsKey, receipts);
  window.dispatchEvent(new Event("savoury-pos-receipts-updated"));
}

export function getHeldOrders(): HeldPosOrder[] {
  return readLocal<HeldPosOrder[]>(heldOrdersKey, []);
}

export function saveHeldOrders(orders: HeldPosOrder[]) {
  writeLocal(heldOrdersKey, orders);
}

export function getSalesRepresentatives(): SalesRepresentative[] {
  return readLocal<SalesRepresentative[]>(salesRepKey, [
    {
      id: "demo-sales-rep",
      fullName: "Counter Sales Rep",
      email: "sales@savoury.local",
      staffId: "SV-POS-001",
      status: "active",
      permissions: ["discounts", "reports"],
      createdAt: new Date().toISOString(),
    },
  ]);
}

export async function fetchSalesRepresentatives(): Promise<SalesRepresentative[]> {
  if (!isSupabaseConfigured || !supabase) return getSalesRepresentatives();
  const { data, error } = await supabase
    .from("sales_representatives")
    .select("id, full_name, email, phone, staff_id, status, permissions, must_change_password, created_at, last_login_at")
    .order("created_at", { ascending: false });
  if (error) {
    console.warn("Could not load sales representatives. Run supabase/pos-sales-rep-patch.sql once.", error);
    return getSalesRepresentatives();
  }
  return data.map((rep: any) => ({
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
  }));
}

export async function saveSalesRepresentative(rep: Omit<SalesRepresentative, "id" | "createdAt" | "staffId"> & { id?: string; staffId?: string }) {
  const next: SalesRepresentative = {
    id: rep.id || crypto.randomUUID(),
    staffId: rep.staffId || `SV-POS-${Math.floor(1000 + Math.random() * 9000)}`,
    fullName: rep.fullName,
    email: rep.email.trim().toLowerCase(),
    phone: rep.phone,
    status: rep.status,
    permissions: rep.permissions,
    createdAt: new Date().toISOString(),
  };

  if (isSupabaseConfigured && supabase) {
    const { data: functionData, error: functionError } = await supabase.functions.invoke("manage-sales-rep", {
      body: {
        action: "upsert",
        fullName: next.fullName,
        email: next.email,
        phone: next.phone,
        status: next.status,
        permissions: next.permissions,
      },
    });

    if (functionError || functionData?.error) {
      throw new Error(functionData?.error || functionError?.message || "Could not provision the POS login account.");
    }

    if (!functionData?.salesRepresentative) {
      throw new Error("The POS account service returned no Sales Representative account.");
    }

    return {
      ...functionData.salesRepresentative,
      temporaryPassword: functionData.temporaryPassword,
    } as SalesRepresentative;
  }

  const existing = getSalesRepresentatives();
  writeLocal(salesRepKey, [next, ...existing.filter((item) => item.email !== next.email && item.id !== next.id)]);
  return next;
}

export async function resetSalesRepresentativePassword(email: string) {
  if (!isSupabaseConfigured || !supabase) return null;
  const { data, error } = await supabase.functions.invoke("manage-sales-rep", {
    body: { action: "reset_password", email },
  });
  if (error || data?.error) throw new Error(data?.error || error?.message || "Could not reset the POS password.");
  return data?.temporaryPassword as string | undefined;
}

export async function updateSalesRepresentative(rep: SalesRepresentative) {
  return saveSalesRepresentative(rep);
}

export function receiptNumber() {
  const date = new Date();
  const stamp = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
  return `SVR-${stamp}-${String(Date.now()).slice(-5)}`;
}

export function calculatePosSummary(receipts = getLocalReceipts()): PosSalesSummary {
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const monthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const activeReceipts = receipts.filter((receipt) => !receipt.refunded);
  const today = activeReceipts.filter((receipt) => new Date(receipt.createdAt).getTime() >= startToday);
  const weekly = activeReceipts.filter((receipt) => new Date(receipt.createdAt).getTime() >= weekAgo);
  const monthly = activeReceipts.filter((receipt) => new Date(receipt.createdAt).getTime() >= monthAgo);
  const paymentBreakdown: Record<PaymentMethod, number> = { cash: 0, card: 0, transfer: 0 };
  const foodCounts = new Map<string, number>();

  activeReceipts.forEach((receipt) => {
    if (receipt.payment.method === "split") {
      receipt.payment.split?.forEach((split) => {
        paymentBreakdown[split.method] += split.amount;
      });
    } else {
      paymentBreakdown[receipt.payment.method] += receipt.total;
    }
    receipt.items.forEach((item) => foodCounts.set(item.food.name, (foodCounts.get(item.food.name) || 0) + item.quantity));
  });

  const revenueToday = today.reduce((sum, receipt) => sum + receipt.total, 0);
  return {
    salesToday: today.length,
    revenueToday,
    weeklySales: weekly.reduce((sum, receipt) => sum + receipt.total, 0),
    monthlySales: monthly.reduce((sum, receipt) => sum + receipt.total, 0),
    transactions: activeReceipts.length,
    averageOrderValue: activeReceipts.length ? Math.round(activeReceipts.reduce((sum, receipt) => sum + receipt.total, 0) / activeReceipts.length) : 0,
    paymentBreakdown,
    mostSoldFoods: Array.from(foodCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, quantity]) => ({ name, quantity })),
  };
}

export async function createPosReceipt(receipt: PosReceipt) {
  let synced = false;
  let verifiedReceipt = receipt;
  if (isSupabaseConfigured && supabase && navigator.onLine) {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) throw new Error("Your cashier session could not be verified. Sign in again.");

    const { data: cashier, error: cashierError } = await supabase
      .from("sales_representatives")
      .select("full_name, status")
      .eq("auth_user_id", authData.user.id)
      .maybeSingle();
    if (cashierError || !cashier || cashier.status !== "active" || !cashier.full_name?.trim()) {
      throw new Error("Your active Sales Representative profile could not be verified.");
    }

    verifiedReceipt = {
      ...receipt,
      cashierId: authData.user.id,
      cashierName: cashier.full_name.trim(),
    };

    const { error: stockError } = await supabase.rpc("reserve_food_stock", {
      items: verifiedReceipt.items.map((item) => ({ food_id: item.food.id, quantity: item.quantity })),
    });
    if (stockError) throw new Error(stockError.message || "One or more items are out of stock.");

    const { data: order, error: orderError } = await supabase
      .from("pos_orders")
      .insert({
        receipt_number: verifiedReceipt.receiptNumber,
        cashier_id: verifiedReceipt.cashierId,
        cashier_name: verifiedReceipt.cashierName,
        customer_name: verifiedReceipt.customerName || null,
        customer_phone: verifiedReceipt.phone || null,
        table_number: verifiedReceipt.tableNumber || null,
        order_type: verifiedReceipt.orderType,
        subtotal: verifiedReceipt.subtotal,
        discount: verifiedReceipt.discount,
        tax: verifiedReceipt.tax,
        total: verifiedReceipt.total,
        status: "paid",
      })
      .select("id")
      .single();

    if (orderError) throw orderError;

    const orderItems = verifiedReceipt.items.map((item) => ({
      pos_order_id: order.id,
      food_id: item.food.id,
      food_name: item.food.name,
      quantity: item.quantity,
      unit_price: item.food.price,
      subtotal: item.food.price * item.quantity,
    }));
    const { error: itemError } = await supabase.from("pos_order_items").insert(orderItems);
    if (itemError) throw itemError;

    const { error: paymentError } = await supabase.from("pos_payments").insert({
      pos_order_id: order.id,
      method: verifiedReceipt.payment.method,
      amount_paid: verifiedReceipt.payment.amountPaid,
      change_amount: verifiedReceipt.payment.change,
      split_details: verifiedReceipt.payment.split || null,
    });
    if (paymentError) throw paymentError;

    await supabase.from("pos_receipts").insert({
      pos_order_id: order.id,
      receipt_number: verifiedReceipt.receiptNumber,
      receipt_payload: verifiedReceipt,
      printed_at: new Date().toISOString(),
    });
    synced = true;
  }

  const finalReceipt = { ...verifiedReceipt, synced };
  saveLocalReceipts([finalReceipt, ...getLocalReceipts().filter((item) => item.id !== finalReceipt.id)]);
  localStorage.setItem(lastReceiptKey, finalReceipt.id);
  return finalReceipt;
}

export function holdPosOrder(order: HeldPosOrder) {
  saveHeldOrders([order, ...getHeldOrders().filter((item) => item.id !== order.id)]);
}

export function removeHeldOrder(orderId: string) {
  saveHeldOrders(getHeldOrders().filter((order) => order.id !== orderId));
}

export function getLastReceipt() {
  const lastId = localStorage.getItem(lastReceiptKey);
  return getLocalReceipts().find((receipt) => receipt.id === lastId) || getLocalReceipts()[0] || null;
}

export function refundLocalReceipt(receiptId: string) {
  const receipts = getLocalReceipts();
  const next = receipts.map((receipt) => (receipt.id === receiptId ? { ...receipt, refunded: true } : receipt));
  saveLocalReceipts(next);
}

export function lowStockFoods(foods: Food[]) {
  return foods.filter((food) => (food.stockQuantity ?? 0) > 0 && (food.stockQuantity ?? 0) <= 5);
}
