import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Minus, Plus, ReceiptText, Search, ShoppingBag, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Input, Textarea } from "@/components/ui/Input";
import { categories, foods as fallbackFoods } from "@/data/catalog";
import { useAuth } from "@/hooks/useAuth";
import { formatCurrency } from "@/lib/utils";
import { fetchCategories, fetchFoods, foodKeys } from "@/services/foodService";
import { savePointOfSaleOrder } from "@/services/orderStorage";
import type { CartItem, Food, FoodCategory, PaymentMethod } from "@/types";

type DiningMode = "dining" | "takeaway";

export function CashierDashboardPage() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const { data: menuFoods = fallbackFoods } = useQuery({ queryKey: foodKeys.all, queryFn: fetchFoods });
  const { data: menuCategories = categories } = useQuery({ queryKey: foodKeys.categories, queryFn: fetchCategories });
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<"All" | FoodCategory>("All");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [diningMode, setDiningMode] = useState<DiningMode>("dining");
  const [customer, setCustomer] = useState({ name: "Walk-in Customer", phone: "", notes: "" });
  const [discount, setDiscount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [lastReceipt, setLastReceipt] = useState<string | null>(null);

  const filteredFoods = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return menuFoods.filter((food) => {
      const matchesQuery = !normalizedQuery || [food.name, food.category, food.description].some((value) => value.toLowerCase().includes(normalizedQuery));
      const matchesCategory = category === "All" || food.category === category;
      return matchesQuery && matchesCategory;
    });
  }, [menuFoods, query, category]);

  const subtotal = cart.reduce((sum, item) => sum + item.food.price * item.quantity, 0);
  const safeDiscount = Math.min(Math.max(0, discount), subtotal);
  const tax = Math.round((subtotal - safeDiscount) * 0.075);
  const total = Math.max(0, subtotal - safeDiscount + tax);
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const addFood = (food: Food) => {
    const stock = food.stockQuantity ?? 50;
    if (stock <= 0) {
      setMessage(`${food.name} is out of stock.`);
      return;
    }
    setCart((current) => {
      const existing = current.find((item) => item.food.id === food.id);
      if (!existing) return [...current, { food, quantity: 1 }];
      if (existing.quantity >= stock) {
        setMessage(`Only ${stock} ${food.name} left in stock.`);
        return current;
      }
      return current.map((item) => (item.food.id === food.id ? { ...item, quantity: item.quantity + 1 } : item));
    });
  };

  const setQuantity = (foodId: string, nextQuantity: number) => {
    setCart((current) =>
      current.flatMap((item) => {
        if (item.food.id !== foodId) return [item];
        if (nextQuantity <= 0) return [];
        return [{ ...item, quantity: Math.min(nextQuantity, item.food.stockQuantity ?? 50) }];
      })
    );
  };

  const completeSale = async () => {
    if (cart.length === 0) {
      setMessage("Add at least one food item before completing the sale.");
      return;
    }

    setSaving(true);
    setMessage("");
    try {
      const order = await savePointOfSaleOrder({
        cashierId: user?.id,
        cashierName: profile?.fullName,
        customerName: customer.name || "Walk-in Customer",
        phone: customer.phone || "Not provided",
        items: cart,
        paymentMethod,
        diningMode,
        subtotal,
        tax,
        discount: safeDiscount,
        total,
        notes: customer.notes,
      });
      setCart([]);
      setDiscount(0);
      setCustomer({ name: "Walk-in Customer", phone: "", notes: "" });
      setLastReceipt(order.id);
      setMessage(`Sale completed. Receipt ${order.id} is ready.`);
      await queryClient.invalidateQueries({ queryKey: foodKeys.all });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not complete sale.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="app-container py-6">
      <div className="mb-5 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-savoury-primary">Cashier dashboard</p>
          <h1 className="section-title text-3xl md:text-4xl">Restaurant POS</h1>
          <p className="mt-2 max-w-2xl text-sm font-semibold text-zinc-500">
            Attend to physical customers, create walk-in orders, collect payment, and update stock instantly.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 rounded-2xl border border-zinc-100 bg-white p-2 shadow-soft dark:border-white/10 dark:bg-[#181818]">
          <ModeButton active={diningMode === "dining"} label="Dining" onClick={() => setDiningMode("dining")} />
          <ModeButton active={diningMode === "takeaway"} label="Takeaway" onClick={() => setDiningMode("takeaway")} />
        </div>
      </div>

      {message && <p className="mb-5 rounded-xl border border-savoury-primary/20 bg-savoury-accent px-4 py-3 text-sm font-black text-savoury-primary dark:bg-savoury-primary/10">{message}</p>}

      <section className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <div className="space-y-5">
          <Card>
            <CardContent className="p-4">
              <div className="grid gap-3 md:grid-cols-[1fr_220px]">
                <label className="flex h-12 items-center gap-3 rounded-xl border border-zinc-100 bg-zinc-50 px-4 dark:border-white/10 dark:bg-white/5">
                  <Search className="h-5 w-5 text-zinc-500" />
                  <input
                    className="min-w-0 flex-1 bg-transparent text-sm font-bold outline-none placeholder:text-zinc-500"
                    placeholder="Search meals for walk-in customer"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                  />
                </label>
                <select
                  className="h-12 rounded-xl border border-zinc-100 bg-zinc-50 px-4 text-sm font-bold outline-none dark:border-white/10 dark:bg-white/5"
                  value={category}
                  onChange={(event) => setCategory(event.target.value as "All" | FoodCategory)}
                >
                  <option value="All">All categories</option>
                  {menuCategories.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}
                </select>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredFoods.map((food) => {
              const stock = food.stockQuantity ?? 50;
              const out = stock <= 0;
              return (
                <button
                  key={food.id}
                  onClick={() => addFood(food)}
                  disabled={out}
                  className="group overflow-hidden rounded-2xl border border-zinc-100 bg-white text-left shadow-soft transition hover:-translate-y-0.5 hover:border-savoury-primary disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-[#181818]"
                >
                  <img src={food.image} alt={food.name} className="h-32 w-full object-cover" />
                  <div className="p-3">
                    <div className="flex items-start justify-between gap-3">
                      <p className="line-clamp-1 font-black text-zinc-950 dark:text-white">{food.name}</p>
                      <p className="shrink-0 font-black text-savoury-primary">{formatCurrency(food.price)}</p>
                    </div>
                    <p className="mt-1 line-clamp-1 text-xs font-semibold text-zinc-500">{food.category}</p>
                    <div className="mt-3 flex items-center justify-between">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-black ${out ? "bg-red-500/10 text-red-500" : "bg-savoury-accent text-savoury-primary"}`}>
                        {out ? "Out of stock" : `${stock} in stock`}
                      </span>
                      <span className="grid h-8 w-8 place-items-center rounded-full bg-savoury-primary text-white">
                        <Plus className="h-4 w-4" />
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <aside className="h-fit xl:sticky xl:top-24">
          <Card>
            <CardContent className="space-y-5 p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black">Current Sale</h2>
                  <p className="text-sm font-semibold text-zinc-500">{itemCount} item{itemCount === 1 ? "" : "s"} selected</p>
                </div>
                <ShoppingBag className="h-7 w-7 text-savoury-primary" />
              </div>

              <div className="grid gap-3">
                <Input placeholder="Customer name" value={customer.name} onChange={(event) => setCustomer({ ...customer, name: event.target.value })} />
                <Input placeholder="Phone number optional" value={customer.phone} onChange={(event) => setCustomer({ ...customer, phone: event.target.value })} />
              </div>

              <div className="max-h-[320px] space-y-3 overflow-auto pr-1">
                {cart.map((item) => (
                  <div key={item.food.id} className="rounded-2xl border border-zinc-100 p-3 dark:border-white/10">
                    <div className="flex justify-between gap-3">
                      <div>
                        <p className="font-black">{item.food.name}</p>
                        <p className="text-sm font-bold text-savoury-primary">{formatCurrency(item.food.price * item.quantity)}</p>
                      </div>
                      <button className="text-zinc-400 transition hover:text-red-500" onClick={() => setQuantity(item.food.id, 0)}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <Button size="icon" variant="outline" onClick={() => setQuantity(item.food.id, item.quantity - 1)}><Minus className="h-4 w-4" /></Button>
                      <span className="grid h-10 min-w-14 place-items-center rounded-xl bg-zinc-100 font-black dark:bg-white/10">{item.quantity}</span>
                      <Button size="icon" variant="outline" onClick={() => setQuantity(item.food.id, item.quantity + 1)}><Plus className="h-4 w-4" /></Button>
                      <span className="ml-auto text-xs font-bold text-zinc-500">{item.food.stockQuantity ?? 50} stock</span>
                    </div>
                  </div>
                ))}
                {cart.length === 0 && <div className="rounded-2xl border border-dashed border-zinc-200 p-5 text-center text-sm font-semibold text-zinc-500 dark:border-white/10">Select menu items to start a sale.</div>}
              </div>

              <div className="grid gap-2 rounded-2xl bg-zinc-50 p-3 dark:bg-white/5">
                <p className="text-sm font-black">Payment</p>
                <div className="grid grid-cols-3 gap-2">
                  {(["cash", "card", "transfer"] as PaymentMethod[]).map((method) => (
                    <button
                      key={method}
                      className={`rounded-xl px-3 py-2 text-sm font-black capitalize transition ${paymentMethod === method ? "bg-savoury-primary text-white" : "bg-white text-zinc-600 dark:bg-zinc-950 dark:text-zinc-300"}`}
                      onClick={() => setPaymentMethod(method)}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>

              <Textarea rows={3} placeholder="Sale note optional" value={customer.notes} onChange={(event) => setCustomer({ ...customer, notes: event.target.value })} />
              <Input type="number" min={0} placeholder="Discount" value={discount || ""} onChange={(event) => setDiscount(Number(event.target.value || 0))} />

              <div className="space-y-2 border-t border-zinc-100 pt-4 text-sm dark:border-white/10">
                <Line label="Subtotal" value={formatCurrency(subtotal)} />
                <Line label="Discount" value={`-${formatCurrency(safeDiscount)}`} />
                <Line label="Tax" value={formatCurrency(tax)} />
                <Line label="Total" value={formatCurrency(total)} strong />
              </div>

              <Button className="w-full" size="lg" onClick={completeSale} disabled={saving || cart.length === 0}>
                <ReceiptText className="h-5 w-5" />
                {saving ? "Completing sale..." : "Complete Sale"}
              </Button>
              {lastReceipt && <p className="text-center text-xs font-bold text-zinc-500">Last receipt: {lastReceipt}</p>}
            </CardContent>
          </Card>
        </aside>
      </section>
    </main>
  );
}

function ModeButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button className={`rounded-xl px-4 py-2 text-sm font-black transition ${active ? "bg-savoury-primary text-white" : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-white/10"}`} onClick={onClick}>
      {label}
    </button>
  );
}

function Line({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between gap-4 ${strong ? "text-lg font-black" : "font-semibold text-zinc-500"}`}>
      <span>{label}</span>
      <span className={strong ? "text-savoury-primary" : ""}>{value}</span>
    </div>
  );
}
