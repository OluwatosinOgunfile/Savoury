import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BadgeDollarSign,
  BarChart3,
  Bell,
  Clock,
  Download,
  Minus,
  PauseCircle,
  Plus,
  Printer,
  ReceiptText,
  RotateCcw,
  Search,
  ShieldCheck,
  ShoppingBag,
  Trash2,
  UserRound,
  WifiOff,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { categories as fallbackCategories, foods as fallbackFoods } from "@/data/catalog";
import { useAuth } from "@/hooks/useAuth";
import { formatCurrency } from "@/lib/utils";
import { fetchCategories, fetchFoods, foodKeys } from "@/services/foodService";
import {
  calculatePosSummary,
  createPosReceipt,
  getHeldOrders,
  getLastReceipt,
  getLocalReceipts,
  holdPosOrder,
  lowStockFoods,
  refundLocalReceipt,
  removeHeldOrder,
  type HeldPosOrder,
  type PosOrderType,
  type PosPayment,
  type PosPaymentMethod,
  type PosReceipt,
} from "@/services/posService";
import type { CartItem, Food, FoodCategory, PaymentMethod } from "@/types";

type PosTab = "pos" | "orders" | "receipts" | "reports" | "profile";

export function SalesRepPosPage() {
  const { profile, signOut } = useAuth();
  const queryClient = useQueryClient();
  const { data: menuFoods = fallbackFoods } = useQuery({ queryKey: foodKeys.all, queryFn: fetchFoods });
  const { data: menuCategories = fallbackCategories } = useQuery({ queryKey: foodKeys.categories, queryFn: fetchCategories });
  const [activeTab, setActiveTab] = useState<PosTab>("pos");
  const [category, setCategory] = useState<"All" | FoodCategory>("All");
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [heldOrders, setHeldOrders] = useState<HeldPosOrder[]>(() => getHeldOrders());
  const [receipts, setReceipts] = useState<PosReceipt[]>(() => getLocalReceipts());
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState<PosReceipt | null>(null);
  const [toast, setToast] = useState("Ready for counter sales.");
  const [now, setNow] = useState(new Date());
  const [online, setOnline] = useState(navigator.onLine);
  const [customer, setCustomer] = useState({ name: "", phone: "", tableNumber: "", deliveryAddress: "", orderType: "takeaway" as PosOrderType });
  const [discount, setDiscount] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    const syncReceipts = () => setReceipts(getLocalReceipts());
    const onlineHandler = () => {
      setOnline(true);
      setToast("Connection restored. Offline transactions are ready to sync.");
    };
    const offlineHandler = () => {
      setOnline(false);
      setToast("Offline mode active. Sales will be stored locally.");
    };
    window.addEventListener("online", onlineHandler);
    window.addEventListener("offline", offlineHandler);
    window.addEventListener("savoury-pos-receipts-updated", syncReceipts);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("online", onlineHandler);
      window.removeEventListener("offline", offlineHandler);
      window.removeEventListener("savoury-pos-receipts-updated", syncReceipts);
    };
  }, []);

  const filteredFoods = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return menuFoods.filter((food) => {
      const matchesCategory = category === "All" || food.category === category;
      const matchesSearch = !normalized || [food.name, food.category, food.description].some((value) => value.toLowerCase().includes(normalized));
      return matchesCategory && matchesSearch;
    });
  }, [category, menuFoods, query]);

  const subtotal = cart.reduce((sum, item) => sum + item.food.price * item.quantity, 0);
  const safeDiscount = Math.min(discount, subtotal);
  const tax = Math.round((subtotal - safeDiscount) * 0.075);
  const total = Math.max(0, subtotal - safeDiscount + tax);
  const summary = useMemo(() => calculatePosSummary(receipts), [receipts]);
  const lowStock = lowStockFoods(menuFoods);
  const outOfStock = menuFoods.filter((food) => (food.stockQuantity ?? 0) <= 0);

  const addFood = (food: Food) => {
    const stock = food.stockQuantity ?? 0;
    if (stock <= 0) {
      setToast("This item is currently out of stock.");
      return;
    }
    setCart((current) => {
      const existing = current.find((item) => item.food.id === food.id);
      if (!existing) return [...current, { food, quantity: 1 }];
      if (existing.quantity >= stock) {
        setToast(`Only ${stock} ${food.name} available in stock.`);
        return current;
      }
      return current.map((item) => (item.food.id === food.id ? { ...item, quantity: item.quantity + 1 } : item));
    });
  };

  const setQuantity = (foodId: string, quantity: number) => {
    setCart((current) =>
      current.flatMap((item) => {
        if (item.food.id !== foodId) return [item];
        if (quantity <= 0) return [];
        return [{ ...item, quantity: Math.min(quantity, item.food.stockQuantity ?? 0) }];
      })
    );
  };

  const clearOrder = () => {
    setCart([]);
    setDiscount(0);
    setCustomer({ name: "", phone: "", tableNumber: "", deliveryAddress: "", orderType: "takeaway" });
  };

  const holdOrder = () => {
    if (!cart.length) {
      setToast("Add items before holding an order.");
      return;
    }
    const held: HeldPosOrder = {
      id: crypto.randomUUID(),
      label: customer.name || customer.tableNumber || `Order ${heldOrders.length + 1}`,
      items: cart,
      customerName: customer.name || undefined,
      phone: customer.phone || undefined,
      tableNumber: customer.tableNumber || undefined,
      deliveryAddress: customer.deliveryAddress || undefined,
      orderType: customer.orderType,
      discount: safeDiscount,
      createdAt: new Date().toISOString(),
    };
    holdPosOrder(held);
    setHeldOrders(getHeldOrders());
    clearOrder();
    setToast("Order held successfully.");
  };

  const resumeOrder = (order: HeldPosOrder) => {
    setCart(order.items);
    setCustomer({
      name: order.customerName || "",
      phone: order.phone || "",
      tableNumber: order.tableNumber || "",
      deliveryAddress: order.deliveryAddress || "",
      orderType: order.orderType,
    });
    setDiscount(order.discount);
    removeHeldOrder(order.id);
    setHeldOrders(getHeldOrders());
    setActiveTab("pos");
    setToast("Held order resumed.");
  };

  const completePayment = async (payment: PosPayment) => {
    if (!profile?.id || !profile.fullName.trim()) {
      setToast("Your cashier profile could not be verified. Sign out and sign in again.");
      return;
    }

    const receipt: PosReceipt = {
      id: crypto.randomUUID(),
      receiptNumber: `SV-${Date.now().toString().slice(-8)}`,
      cashierId: profile.id,
      cashierName: profile.fullName.trim(),
      customerName: customer.name || undefined,
      phone: customer.phone || undefined,
      tableNumber: customer.tableNumber || undefined,
      deliveryAddress: customer.deliveryAddress || undefined,
      orderType: customer.orderType,
      items: cart,
      subtotal,
      discount: safeDiscount,
      tax,
      total,
      payment,
      createdAt: new Date().toISOString(),
      synced: false,
    };

    try {
      const saved = await createPosReceipt(receipt);
      await queryClient.invalidateQueries({ queryKey: foodKeys.all });
      clearOrder();
      setPaymentOpen(false);
      setReceiptOpen(saved);
      setReceipts(getLocalReceipts());
      setToast(saved.synced ? "Payment successful. Receipt generated." : "Payment saved offline. Receipt generated.");
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Network error. Could not complete payment.");
    }
  };

  return (
    <main className="min-h-screen bg-zinc-50 pb-24 dark:bg-[#0d0d0d] lg:pb-8">
      <section className="border-b border-zinc-200 bg-white/90 px-4 py-4 backdrop-blur-xl dark:border-white/10 dark:bg-[#141414]/90">
        <div className="mx-auto flex max-w-[1500px] flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-savoury-primary">Sales Representative</p>
            <h1 className="text-2xl font-black text-zinc-950 dark:text-white md:text-3xl">Counter POS Dashboard</h1>
            <p className="mt-1 text-sm font-semibold text-zinc-500">
              {profile?.fullName || "POS Staff"} • {now.toLocaleDateString()} • {now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 md:flex">
            <PosMetric label="Sales Today" value={summary.salesToday.toString()} />
            <PosMetric label="Revenue" value={formatCurrency(summary.revenueToday)} />
            <button className={`rounded-xl px-4 py-3 text-left text-xs font-black ${online ? "bg-emerald-500/10 text-emerald-600" : "bg-red-500/10 text-red-500"}`}>
              {online ? "Online" : "Offline Mode"}
            </button>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-[1500px] gap-4 px-4 py-4 lg:grid-cols-[220px_1fr_390px]">
        <aside className="rounded-2xl border border-zinc-100 bg-white p-3 shadow-soft dark:border-white/10 dark:bg-[#171717]">
          <nav className="grid grid-cols-5 gap-2 lg:grid-cols-1">
            {[
              ["pos", "POS", ShoppingBag],
              ["orders", "Orders", PauseCircle],
              ["receipts", "Receipts", ReceiptText],
              ["reports", "Reports", BarChart3],
              ["profile", "Profile", UserRound],
            ].map(([id, label, Icon]) => (
              <button
                key={id as string}
                onClick={() => setActiveTab(id as PosTab)}
                className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-2 text-xs font-black transition lg:flex-row lg:justify-start lg:px-4 lg:text-sm ${
                  activeTab === id ? "bg-savoury-primary text-white shadow-soft" : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-white/10"
                }`}
              >
                <Icon className="h-5 w-5" />
                {label as string}
              </button>
            ))}
            <button onClick={signOut} className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-2 text-xs font-black text-red-500 hover:bg-red-500/10 lg:flex-row lg:justify-start lg:px-4 lg:text-sm">
              <X className="h-5 w-5" />
              Logout
            </button>
          </nav>

          <div className="mt-4 hidden lg:block">
            <h2 className="mb-2 text-xs font-black uppercase tracking-[0.15em] text-zinc-400">Categories</h2>
            <div className="grid gap-2">
              {["All", "Rice", "Swallow", "Soups", "Drinks", "Snacks", "Desserts", "Specials"].map((item) => (
                <button
                  key={item}
                  onClick={() => setCategory(item as "All" | FoodCategory)}
                  className={`rounded-xl px-4 py-3 text-left text-sm font-black transition ${category === item ? "bg-savoury-accent text-savoury-primary dark:bg-savoury-primary/10" : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-white/10"}`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </aside>

        <section className={activeTab === "pos" ? "space-y-4" : "lg:col-span-2"}>
          {activeTab === "pos" && (
            <>
              <Card className="bg-white/90 dark:bg-[#171717]/95">
                <CardContent className="space-y-3">
                  <div className="grid gap-3 md:grid-cols-[1fr_220px]">
                    <label className="flex h-12 items-center gap-3 rounded-xl border border-zinc-100 bg-zinc-50 px-4 dark:border-white/10 dark:bg-white/5">
                      <Search className="h-5 w-5 text-zinc-500" />
                      <input className="min-w-0 flex-1 bg-transparent text-sm font-bold outline-none" placeholder="Search meals, prices, categories..." value={query} onChange={(event) => setQuery(event.target.value)} />
                    </label>
                    <select className="h-12 rounded-xl border border-zinc-100 bg-zinc-50 px-4 text-sm font-black outline-none dark:border-white/10 dark:bg-white/5" value={category} onChange={(event) => setCategory(event.target.value as "All" | FoodCategory)}>
                      <option value="All">All categories</option>
                      {menuCategories.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {lowStock.slice(0, 3).map((food) => <Notice key={food.id} tone="amber" text={`Low stock: ${food.name} (${food.stockQuantity})`} />)}
                    {outOfStock.slice(0, 3).map((food) => <Notice key={food.id} tone="red" text={`Out of stock: ${food.name}`} />)}
                    {!online && <Notice tone="red" text="Offline: sales will sync when internet returns." />}
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {filteredFoods.map((food) => <FoodTile key={food.id} food={food} onAdd={() => addFood(food)} />)}
              </div>
            </>
          )}
          {activeTab === "orders" && <OrdersPanel heldOrders={heldOrders} onResume={resumeOrder} onRemove={(id) => { removeHeldOrder(id); setHeldOrders(getHeldOrders()); }} />}
          {activeTab === "receipts" && <ReceiptsPanel canRefund={profile?.permissions.includes("refunds") === true} receipts={receipts} onOpen={setReceiptOpen} onRefund={(receipt) => { refundLocalReceipt(receipt.id); setReceipts(getLocalReceipts()); setToast("Receipt refunded locally."); }} />}
          {activeTab === "reports" && <ReportsPanel summary={summary} />}
          {activeTab === "profile" && <ProfilePanel profile={profile} />}
        </section>

        {activeTab === "pos" && (
          <aside className="h-fit rounded-2xl border border-zinc-100 bg-white shadow-soft dark:border-white/10 dark:bg-[#171717] lg:sticky lg:top-20">
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black">Current Order</h2>
                  <p className="text-sm font-semibold text-zinc-500">{cart.reduce((sum, item) => sum + item.quantity, 0)} items</p>
                </div>
                <BadgeDollarSign className="h-8 w-8 text-savoury-primary" />
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <Input placeholder="Customer name" value={customer.name} onChange={(event) => setCustomer({ ...customer, name: event.target.value })} />
                <Input placeholder="Phone" value={customer.phone} onChange={(event) => setCustomer({ ...customer, phone: event.target.value })} />
                <Input placeholder="Table optional" value={customer.tableNumber} onChange={(event) => setCustomer({ ...customer, tableNumber: event.target.value })} />
                <select className="h-12 rounded-xl border border-zinc-200 bg-white px-4 text-sm font-bold text-zinc-950 outline-none dark:border-white/10 dark:bg-[#101010] dark:text-white" value={customer.orderType} onChange={(event) => setCustomer({ ...customer, orderType: event.target.value as PosOrderType })}>
                  <option value="dine_in">Dine In</option>
                  <option value="takeaway">Takeaway</option>
                  <option value="delivery">Delivery</option>
                </select>
                {customer.orderType === "delivery" && (
                  <Input className="sm:col-span-2" placeholder="Delivery address" value={customer.deliveryAddress} onChange={(event) => setCustomer({ ...customer, deliveryAddress: event.target.value })} />
                )}
              </div>

              <div className="max-h-[330px] space-y-3 overflow-auto pr-1">
                {cart.map((item) => (
                  <div key={item.food.id} className="rounded-xl border border-zinc-100 p-3 dark:border-white/10">
                    <div className="flex justify-between gap-3">
                      <div>
                        <p className="font-black">{item.food.name}</p>
                        <p className="text-sm font-bold text-savoury-primary">{formatCurrency(item.food.price * item.quantity)}</p>
                      </div>
                      <button className="text-zinc-400 hover:text-red-500" onClick={() => setQuantity(item.food.id, 0)}><Trash2 className="h-4 w-4" /></button>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <Button size="icon" variant="outline" onClick={() => setQuantity(item.food.id, item.quantity - 1)}><Minus className="h-4 w-4" /></Button>
                      <span className="grid h-10 min-w-14 place-items-center rounded-xl bg-zinc-100 font-black dark:bg-white/10">{item.quantity}</span>
                      <Button size="icon" variant="outline" onClick={() => setQuantity(item.food.id, item.quantity + 1)}><Plus className="h-4 w-4" /></Button>
                      <span className="ml-auto text-xs font-bold text-zinc-500">{item.food.stockQuantity ?? 0} stock</span>
                    </div>
                  </div>
                ))}
                {!cart.length && <div className="rounded-xl border border-dashed border-zinc-200 p-5 text-center text-sm font-semibold text-zinc-500 dark:border-white/10">Tap a menu item to begin.</div>}
              </div>

              <Input type="number" min={0} placeholder="Discount" value={discount || ""} onChange={(event) => setDiscount(Number(event.target.value || 0))} />
              <Totals subtotal={subtotal} discount={safeDiscount} tax={tax} total={total} />
              <div className="grid grid-cols-3 gap-2">
                <Button variant="outline" onClick={holdOrder}><PauseCircle className="h-4 w-4" /> Hold</Button>
                <Button variant="outline" onClick={clearOrder}><Trash2 className="h-4 w-4" /> Clear</Button>
                <Button onClick={() => {
                  if (!cart.length) return setToast("Add items before payment.");
                  if (customer.orderType === "delivery" && !customer.deliveryAddress.trim()) return setToast("Enter a delivery address before payment.");
                  setPaymentOpen(true);
                }}><BadgeDollarSign className="h-4 w-4" /> Pay</Button>
              </div>
              <Button className="w-full" variant="secondary" onClick={() => { const last = getLastReceipt(); last ? setReceiptOpen(last) : setToast("No receipt to reprint yet."); }}>
                <Printer className="h-4 w-4" /> Reprint Last Receipt
              </Button>
            </CardContent>
          </aside>
        )}
      </div>

      <div className="fixed bottom-20 left-4 right-4 z-40 mx-auto max-w-xl rounded-xl border border-savoury-primary/20 bg-savoury-accent px-4 py-3 text-sm font-black text-savoury-primary shadow-soft dark:bg-savoury-primary/10 lg:bottom-4">
        <Bell className="mr-2 inline h-4 w-4" /> {toast}
      </div>

      {paymentOpen && <PaymentModal total={total} onClose={() => setPaymentOpen(false)} onComplete={completePayment} />}
      {receiptOpen && <ReceiptModal receipt={receiptOpen} onClose={() => setReceiptOpen(null)} />}
    </main>
  );
}

function PosMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-3 dark:border-white/10 dark:bg-white/5">
      <p className="text-[11px] font-black uppercase text-zinc-400">{label}</p>
      <p className="text-sm font-black text-zinc-950 dark:text-white">{value}</p>
    </div>
  );
}

function Notice({ tone, text }: { tone: "amber" | "red"; text: string }) {
  return <span className={`rounded-full px-3 py-1 text-xs font-black ${tone === "amber" ? "bg-amber-500/10 text-amber-500" : "bg-red-500/10 text-red-500"}`}>{text}</span>;
}

function FoodTile({ food, onAdd }: { food: Food; onAdd: () => void }) {
  const stock = food.stockQuantity ?? 0;
  return (
    <button onClick={onAdd} className="group overflow-hidden rounded-2xl border border-zinc-100 bg-white text-left shadow-soft transition hover:-translate-y-0.5 hover:border-savoury-primary dark:border-white/10 dark:bg-[#171717]">
      <div className="relative h-36 overflow-hidden">
        <img loading="lazy" src={food.image} alt={food.name} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
        <span className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-xs font-black ${stock > 0 ? "bg-white text-savoury-primary" : "bg-red-500 text-white"}`}>
          {stock > 0 ? `${stock} left` : "Out"}
        </span>
      </div>
      <div className="p-3">
        <p className="line-clamp-1 font-black">{food.name}</p>
        <div className="mt-2 flex items-center justify-between">
          <p className="font-black text-savoury-primary">{formatCurrency(food.price)}</p>
          <span className="rounded-xl bg-savoury-primary px-3 py-2 text-xs font-black text-white">Add</span>
        </div>
      </div>
    </button>
  );
}

function Totals({ subtotal, discount, tax, total }: { subtotal: number; discount: number; tax: number; total: number }) {
  return (
    <div className="space-y-2 rounded-xl bg-zinc-50 p-4 text-sm dark:bg-white/5">
      <Line label="Subtotal" value={formatCurrency(subtotal)} />
      <Line label="Discount" value={`-${formatCurrency(discount)}`} />
      <Line label="Tax" value={formatCurrency(tax)} />
      <div className="flex justify-between border-t border-zinc-200 pt-3 text-xl font-black dark:border-white/10">
        <span>Total</span>
        <span className="text-savoury-primary">{formatCurrency(total)}</span>
      </div>
    </div>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between font-bold text-zinc-500"><span>{label}</span><span>{value}</span></div>;
}

function PaymentModal({ total, onClose, onComplete }: { total: number; onClose: () => void; onComplete: (payment: PosPayment) => void }) {
  const [method, setMethod] = useState<PosPaymentMethod>("cash");
  const [amountPaid, setAmountPaid] = useState(total);
  const [split, setSplit] = useState({ cash: 0, card: 0, transfer: 0 });
  const splitTotal = split.cash + split.card + split.transfer;
  const paid = method === "split" ? splitTotal : amountPaid;
  const change = Math.max(0, paid - total);
  const canPay = paid >= total;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4">
      <Card className="w-full max-w-lg dark:bg-[#171717]">
        <CardContent className="space-y-4 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-savoury-primary">Payment</p>
              <h2 className="text-2xl font-black">{formatCurrency(total)}</h2>
            </div>
            <button onClick={onClose} className="rounded-full p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-white/10"><X className="h-5 w-5" /></button>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {(["cash", "card", "transfer", "split"] as PosPaymentMethod[]).map((item) => (
              <button key={item} onClick={() => { setMethod(item); setAmountPaid(item === "cash" ? total : total); }} className={`rounded-xl px-3 py-3 text-sm font-black capitalize ${method === item ? "bg-savoury-primary text-white" : "bg-zinc-100 text-zinc-600 dark:bg-white/10 dark:text-zinc-300"}`}>{item === "split" ? "Multiple" : item}</button>
            ))}
          </div>
          {method === "split" ? (
            <div className="grid gap-3">
              {(["cash", "card", "transfer"] as PaymentMethod[]).map((item) => <Input key={item} type="number" min={0} placeholder={`${item} amount`} value={split[item] || ""} onChange={(event) => setSplit({ ...split, [item]: Number(event.target.value || 0) })} />)}
            </div>
          ) : (
            <Input type="number" min={0} placeholder="Amount received" value={amountPaid || ""} onChange={(event) => setAmountPaid(Number(event.target.value || 0))} />
          )}
          <div className="grid grid-cols-3 gap-3">
            <PosMetric label="Total" value={formatCurrency(total)} />
            <PosMetric label="Paid" value={formatCurrency(paid)} />
            <PosMetric label="Change" value={formatCurrency(change)} />
          </div>
          <Button className="w-full" size="lg" disabled={!canPay} onClick={() => onComplete({ method, amountPaid: paid, change, split: method === "split" ? (["cash", "card", "transfer"] as PaymentMethod[]).filter((item) => split[item] > 0).map((item) => ({ method: item, amount: split[item] })) : undefined })}>
            Complete Payment
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function ReceiptModal({ receipt, onClose }: { receipt: PosReceipt; onClose: () => void }) {
  const print = () => window.print();
  const download = () => {
    const blob = new Blob([receiptText(receipt)], { type: "text/plain;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${receipt.receiptNumber}.txt`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4">
      <Card className="w-full max-w-md dark:bg-[#171717]">
        <CardContent className="space-y-4 p-5">
          <div className="flex items-center justify-between print:hidden">
            <h2 className="text-xl font-black">Receipt</h2>
            <button onClick={onClose} className="rounded-full p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-white/10"><X className="h-5 w-5" /></button>
          </div>
          <div className="thermal-receipt mx-auto bg-white p-4 font-mono text-xs text-zinc-950">
            <div className="text-center">
              <img src="/images/savoury-logo-tight.jpeg" alt="Savoury" className="mx-auto h-12 w-12 rounded-full object-cover" />
              <h3 className="mt-2 text-base font-black">Savoury</h3>
              <p>15 Adebayo Adeleke Street, Victoria Island, Lagos</p>
              <p>+234 812 345 6789</p>
              <p className="mt-2">Receipt: {receipt.receiptNumber}</p>
              <p>{new Date(receipt.createdAt).toLocaleString()}</p>
              <p>Cashier: {receipt.cashierName}</p>
              <p>Order type: {receipt.orderType.replace("_", " ")}</p>
              {receipt.deliveryAddress && <p>Deliver to: {receipt.deliveryAddress}</p>}
            </div>
            <div className="my-3 border-t border-dashed border-zinc-400" />
            {receipt.items.map((item) => (
              <div key={item.food.id} className="mb-2">
                <div className="flex justify-between gap-3"><span>{item.food.name}</span><span>{formatCurrency(item.food.price * item.quantity)}</span></div>
                <p>{item.quantity} x {formatCurrency(item.food.price)}</p>
              </div>
            ))}
            <div className="my-3 border-t border-dashed border-zinc-400" />
            <Line label="Subtotal" value={formatCurrency(receipt.subtotal)} />
            <Line label="Discount" value={`-${formatCurrency(receipt.discount)}`} />
            <Line label="Tax" value={formatCurrency(receipt.tax)} />
            <div className="mt-2 flex justify-between text-sm font-black"><span>Total</span><span>{formatCurrency(receipt.total)}</span></div>
            <Line label="Payment" value={receipt.payment.method} />
            <Line label="Paid" value={formatCurrency(receipt.payment.amountPaid)} />
            <Line label="Change" value={formatCurrency(receipt.payment.change)} />
            <p className="mt-4 text-center">Thank you for dining with us.</p>
          </div>
          <div className="grid grid-cols-3 gap-2 print:hidden">
            <Button variant="outline" onClick={print}><Printer className="h-4 w-4" /> Print</Button>
            <Button variant="outline" onClick={download}><Download className="h-4 w-4" /> PDF</Button>
            <Button onClick={onClose}>Done</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function receiptText(receipt: PosReceipt) {
  return [
    "Savoury",
    `Receipt: ${receipt.receiptNumber}`,
    `Cashier: ${receipt.cashierName}`,
    `Order type: ${receipt.orderType.replace("_", " ")}`,
    ...(receipt.deliveryAddress ? [`Deliver to: ${receipt.deliveryAddress}`] : []),
    new Date(receipt.createdAt).toLocaleString(),
    "",
    ...receipt.items.map((item) => `${item.quantity} x ${item.food.name} - ${formatCurrency(item.food.price * item.quantity)}`),
    "",
    `Total: ${formatCurrency(receipt.total)}`,
    `Paid: ${formatCurrency(receipt.payment.amountPaid)}`,
    `Change: ${formatCurrency(receipt.payment.change)}`,
    "Thank you for dining with us.",
  ].join("\n");
}

function OrdersPanel({ heldOrders, onResume, onRemove }: { heldOrders: HeldPosOrder[]; onResume: (order: HeldPosOrder) => void; onRemove: (id: string) => void }) {
  return (
    <Panel title="Held Orders" subtitle="Resume or cancel paused counter orders.">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {heldOrders.map((order) => (
          <Card key={order.id}>
            <CardContent>
              <h3 className="font-black">{order.label}</h3>
              <p className="mt-1 text-sm font-semibold text-zinc-500">{order.items.length} item groups • {order.orderType.replace("_", " ")}</p>
              <p className="mt-1 text-xs text-zinc-400">{new Date(order.createdAt).toLocaleString()}</p>
              <div className="mt-4 flex gap-2">
                <Button onClick={() => onResume(order)}>Resume</Button>
                <Button variant="outline" onClick={() => onRemove(order.id)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {!heldOrders.length && <EmptyPanel text="No held orders." />}
      </div>
    </Panel>
  );
}

function ReceiptsPanel({ receipts, canRefund, onOpen, onRefund }: { receipts: PosReceipt[]; canRefund: boolean; onOpen: (receipt: PosReceipt) => void; onRefund: (receipt: PosReceipt) => void }) {
  const [search, setSearch] = useState("");
  const filtered = receipts.filter((receipt) => [receipt.receiptNumber, receipt.customerName || "", receipt.cashierName].join(" ").toLowerCase().includes(search.toLowerCase()));
  return (
    <Panel title="Receipts" subtitle="Search, reprint, and refund receipts when permitted.">
      <Input className="mb-4 max-w-md" placeholder="Search previous receipts" value={search} onChange={(event) => setSearch(event.target.value)} />
      <div className="grid gap-3">
        {filtered.map((receipt) => (
          <div key={receipt.id} className="flex flex-col justify-between gap-3 rounded-xl border border-zinc-100 bg-white p-4 shadow-soft dark:border-white/10 dark:bg-[#171717] md:flex-row md:items-center">
            <div>
              <p className="font-black">{receipt.receiptNumber} {receipt.refunded && <span className="text-red-500">(Refunded)</span>}</p>
              <p className="text-sm font-semibold text-zinc-500">{new Date(receipt.createdAt).toLocaleString()} • {receipt.payment.method}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpen(receipt)}><Printer className="h-4 w-4" /> Reprint</Button>
              {canRefund && <Button variant="outline" onClick={() => onRefund(receipt)} disabled={receipt.refunded}><RotateCcw className="h-4 w-4" /> Refund</Button>}
            </div>
          </div>
        ))}
        {!filtered.length && <EmptyPanel text="No receipts found." />}
      </div>
    </Panel>
  );
}

function ReportsPanel({ summary }: { summary: ReturnType<typeof calculatePosSummary> }) {
  return (
    <Panel title="POS Reports" subtitle="Simple sales performance for the current POS workspace.">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <ReportCard label="Today" value={formatCurrency(summary.revenueToday)} />
        <ReportCard label="Weekly" value={formatCurrency(summary.weeklySales)} />
        <ReportCard label="Monthly" value={formatCurrency(summary.monthlySales)} />
        <ReportCard label="Avg Order" value={formatCurrency(summary.averageOrderValue)} />
      </div>
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <Card><CardContent><h3 className="font-black">Most Sold Foods</h3>{summary.mostSoldFoods.map((food) => <Line key={food.name} label={food.name} value={`${food.quantity}`} />)}</CardContent></Card>
        <Card><CardContent><h3 className="font-black">Payment Breakdown</h3>{Object.entries(summary.paymentBreakdown).map(([method, value]) => <Line key={method} label={method} value={formatCurrency(value)} />)}</CardContent></Card>
      </div>
    </Panel>
  );
}

function ProfilePanel({ profile }: { profile: ReturnType<typeof useAuth>["profile"] }) {
  return (
    <Panel title="Sales Profile" subtitle="Profile tools for sales representatives.">
      <div className="grid gap-4 md:grid-cols-2">
        <Card><CardContent><UserRound className="h-8 w-8 text-savoury-primary" /><h3 className="mt-3 text-xl font-black">{profile?.fullName || "Sales Representative"}</h3><p className="text-sm font-semibold text-zinc-500">{profile?.email}</p></CardContent></Card>
        <Card><CardContent><ShieldCheck className="h-8 w-8 text-savoury-primary" /><h3 className="mt-3 font-black">POS Access</h3><p className="text-sm font-semibold text-zinc-500">Active sales representative account</p></CardContent></Card>
        <Card className="md:col-span-2"><CardContent><h3 className="font-black">Profile Updates</h3><p className="mt-2 text-sm font-semibold text-zinc-500">Profile picture and password updates use the existing account page and Supabase authentication settings.</p></CardContent></Card>
      </div>
    </Panel>
  );
}

function Panel({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return <section><div className="mb-4"><h2 className="text-2xl font-black">{title}</h2><p className="text-sm font-semibold text-zinc-500">{subtitle}</p></div>{children}</section>;
}

function ReportCard({ label, value }: { label: string; value: string }) {
  return <Card><CardContent><p className="text-xs font-black uppercase text-zinc-400">{label}</p><p className="mt-2 text-2xl font-black text-savoury-primary">{value}</p></CardContent></Card>;
}

function EmptyPanel({ text }: { text: string }) {
  return <div className="rounded-xl border border-dashed border-zinc-200 p-6 text-center text-sm font-bold text-zinc-500 dark:border-white/10">{text}</div>;
}
