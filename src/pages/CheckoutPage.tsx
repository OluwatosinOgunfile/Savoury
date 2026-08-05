import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Banknote, CalendarClock, CreditCard, Landmark, MapPin, ShoppingBag, Store, Truck, UtensilsCrossed, type LucideIcon } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Input, Textarea } from "@/components/ui/Input";
import { addresses } from "@/data/catalog";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import { isSupabaseConfigured } from "@/lib/supabase";
import { formatCurrency } from "@/lib/utils";
import { accountKeys, fetchUserAddresses } from "@/services/accountDataService";
import { foodKeys } from "@/services/foodService";
import { saveSubmittedOrder } from "@/services/orderStorage";
import { paymentProviders } from "@/services/payment";
import type { DeliveryMode, PaymentMethod } from "@/types";

const checkoutSchema = z.object({
  name: z.string().trim().min(2, "Enter your name."),
  phone: z.string().trim().min(7, "Enter a reachable phone number."),
  address: z.string().trim(),
});

export function CheckoutPage() {
  const cart = useCart();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: savedAddresses = addresses } = useQuery({ queryKey: accountKeys.addresses(user?.id), queryFn: () => fetchUserAddresses(user?.id) });
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>("delivery");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");
  const [form, setForm] = useState({ name: "", phone: "", address: "", instructions: "", fulfillmentTime: "asap" });
  const [error, setError] = useState("");
  const [placingOrder, setPlacingOrder] = useState(false);
  const hasStockIssue = cart.items.some((item) => (item.food.stockQuantity ?? 50) <= 0 || item.quantity > (item.food.stockQuantity ?? 50));
  const timeOptions = useMemo(() => getTimeOptions(deliveryMode), [deliveryMode]);
  const selectedTime = timeOptions.find((option) => option.id === form.fulfillmentTime) || timeOptions[0];
  const orderTotal = deliveryMode === "delivery" ? cart.total : cart.total - cart.deliveryFee;
  const estimatedTime = deliveryMode === "delivery" ? "30-45 min" : selectedTime.label.replace("ASAP ", "");

  useEffect(() => {
    setForm((current) => ({
      ...current,
      name: current.name || profile?.fullName || "",
      phone: current.phone || profile?.phone || "",
    }));
  }, [profile]);

  useEffect(() => {
    const defaultAddress = savedAddresses.find((address) => address.default) || savedAddresses[0];
    if (!defaultAddress) return;
    setForm((current) => (current.address ? current : { ...current, address: defaultAddress.line1 }));
  }, [savedAddresses]);

  useEffect(() => {
    setForm((current) => ({ ...current, fulfillmentTime: "asap" }));
  }, [deliveryMode]);

  useEffect(() => {
    if (deliveryMode === "delivery" && paymentMethod === "cash") {
      setPaymentMethod("card");
    }
  }, [deliveryMode, paymentMethod]);

  const placeOrder = async () => {
    if (placingOrder) return;
    setError("");

    const parsed = checkoutSchema.safeParse(form);
    if (!parsed.success || cart.items.length === 0) {
      setError(parsed.success ? "Add at least one meal before placing an order." : parsed.error.issues[0]?.message || "Please complete your customer information.");
      return;
    }
    if (deliveryMode === "delivery" && form.address.trim().length < 5) {
      setError("Enter a delivery address or switch to pickup.");
      return;
    }
    if (isSupabaseConfigured && !user) {
      setError("Please log in before placing an order so the restaurant can receive it.");
      return;
    }
    if (hasStockIssue) {
      setError("One or more items in your cart is out of stock or above available stock.");
      return;
    }

    const orderInstructions = [form.instructions.trim(), deliveryMode === "delivery" ? "" : `Requested time: ${selectedTime.label}`].filter(Boolean).join("\n");

    setPlacingOrder(true);
    try {
      await paymentProviders[paymentMethod === "card" ? "paystack" : paymentMethod].initialize({
        amount: orderTotal,
        email: profile?.email || user?.email || "customer@savoury.local",
        reference: `SV-${Date.now()}`,
        method: paymentMethod,
      });

      const order = await saveSubmittedOrder({
        customerName: form.name,
        phone: form.phone,
        address: deliveryMode === "delivery" ? form.address : deliveryMode === "pickup" ? "Pickup at Savoury Restaurant" : "Dining at Savoury Restaurant",
        items: cart.items,
        paymentMethod,
        deliveryMode,
        total: orderTotal,
        subtotal: cart.subtotal,
        deliveryFee: deliveryMode === "delivery" ? cart.deliveryFee : 0,
        tax: cart.tax,
        instructions: orderInstructions,
        userId: user?.id,
      });
      await queryClient.invalidateQueries({ queryKey: foodKeys.all });
      cart.clearCart();
      navigate(`/track/${order.id}`);
    } catch (orderError) {
      setError(orderError instanceof Error ? orderError.message : "Unable to place order because stock is no longer available.");
    } finally {
      setPlacingOrder(false);
    }
  };

  return (
    <main className="app-container grid gap-6 py-8 lg:grid-cols-[1fr_420px]">
      <section className="space-y-5">
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#151912] via-[#20241b] to-[#556b2f] p-5 text-white shadow-soft md:p-6">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-savoury-secondary">Secure checkout</p>
          <div className="mt-3 flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <h1 className="font-display text-3xl font-black md:text-4xl">Complete your order</h1>
              <p className="mt-3 max-w-2xl text-sm font-semibold text-white/70 md:text-base">
                Confirm your contact details, choose how you want your meal, and send the order straight to the kitchen.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 px-5 py-4 text-sm backdrop-blur">
              <p className="text-white/60">Estimated time</p>
              <p className="font-black">{estimatedTime}</p>
            </div>
          </div>
        </div>
        <Card className="dark-surface">
          <CardContent className="space-y-6 p-5 md:p-6">
            <div>
              <h2 className="text-xl font-black">Contact details</h2>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">We use this to confirm your order and reach you quickly.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input placeholder="Customer name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
              <Input placeholder="Phone number" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
            </div>
          </CardContent>
        </Card>
        <Card className="dark-surface">
          <CardContent className="space-y-6 p-5 md:p-6">
            <div>
              <h2 className="text-xl font-black">Fulfillment</h2>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Choose delivery, pickup, or dining in at the restaurant.</p>
            </div>
            <div className="grid gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 p-2 dark:border-white/10 dark:bg-[#101010] sm:grid-cols-3">
              <FulfillmentButton
                active={deliveryMode === "delivery"}
                icon={Truck}
                title="Delivery"
                note="30-45 min"
                onClick={() => setDeliveryMode("delivery")}
              />
              <FulfillmentButton
                active={deliveryMode === "pickup"}
                icon={Store}
                title="Pickup"
                note="20-30 min"
                onClick={() => setDeliveryMode("pickup")}
              />
              <FulfillmentButton
                active={deliveryMode === "dining"}
                icon={UtensilsCrossed}
                title="Dining"
                note="Dine in"
                onClick={() => setDeliveryMode("dining")}
              />
            </div>
            {deliveryMode === "delivery" && (
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-white/10 dark:bg-[#101010]">
                <label className="mb-3 flex items-center gap-2 text-sm font-black text-zinc-800 dark:text-zinc-200">
                  <MapPin size={18} className="text-savoury-secondary" />
                  Delivery address
                </label>
                <Input placeholder="Enter your full delivery address" value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} />
                {savedAddresses.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {savedAddresses.slice(0, 3).map((address) => (
                      <button
                        key={address.id}
                        type="button"
                        onClick={() => setForm({ ...form, address: address.line1 })}
                        className={`rounded-full border px-3 py-2 text-xs font-bold transition ${
                          form.address === address.line1
                            ? "border-savoury-secondary bg-savoury-secondary text-zinc-950"
                            : "border-zinc-200 bg-white text-zinc-700 hover:border-savoury-primary hover:text-savoury-primary dark:border-white/10 dark:bg-white/5 dark:text-zinc-300 dark:hover:text-white"
                        }`}
                      >
                        {address.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {deliveryMode !== "delivery" && (
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-white/10 dark:bg-[#101010]">
                <label className="mb-3 flex items-center gap-2 text-sm font-black text-zinc-800 dark:text-zinc-200">
                  <CalendarClock size={18} className="text-savoury-secondary" />
                  Time
                </label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {timeOptions.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setForm({ ...form, fulfillmentTime: option.id })}
                      className={`rounded-xl border px-4 py-3 text-left transition ${
                        form.fulfillmentTime === option.id
                          ? "border-savoury-secondary bg-savoury-secondary text-zinc-950"
                          : "border-zinc-200 bg-white text-zinc-700 hover:border-savoury-primary hover:text-savoury-primary dark:border-white/10 dark:bg-white/5 dark:text-zinc-300 dark:hover:text-white"
                      }`}
                    >
                      <span className="block text-sm font-black">{option.label}</span>
                      <span className={`mt-1 block text-xs ${form.fulfillmentTime === option.id ? "text-zinc-800" : "text-zinc-500"}`}>{option.description}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <Textarea rows={4} placeholder="Special instructions, allergies, gate code, or pickup note" value={form.instructions} onChange={(event) => setForm({ ...form, instructions: event.target.value })} />
          </CardContent>
        </Card>
        <Card className="dark-surface">
          <CardContent className="space-y-6 p-5 md:p-6">
            <div>
              <h2 className="text-xl font-black">Payment Method</h2>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Payment modules are ready for live gateway keys when you connect them.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {deliveryMode !== "delivery" && <PaymentCard active={paymentMethod === "cash"} icon={Banknote} title="Cash" onClick={() => setPaymentMethod("cash")} />}
              <PaymentCard active={paymentMethod === "card"} icon={CreditCard} title="Card" onClick={() => setPaymentMethod("card")} />
              <PaymentCard active={paymentMethod === "transfer"} icon={Landmark} title="Transfer" onClick={() => setPaymentMethod("transfer")} />
            </div>
          </CardContent>
        </Card>
        {error && <p className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 font-bold text-red-700 dark:text-red-300">{error}</p>}
      </section>
      <aside className="h-fit lg:sticky lg:top-24">
        <Card className="dark-surface">
          <CardContent className="space-y-5 p-5 md:p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black">Order Summary</h2>
              <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-black text-zinc-700 dark:bg-white/10 dark:text-zinc-300">{cart.itemCount} items</span>
            </div>
            {cart.items.length === 0 ? (
              <div className="rounded-xl border border-dashed border-zinc-200 p-5 text-center text-sm text-zinc-600 dark:border-white/10 dark:text-zinc-400">
                Your cart is empty. Add a meal before checkout.
                <Button className="mt-4 w-full" variant="outline" onClick={() => navigate("/menu")}>Browse Menu</Button>
              </div>
            ) : (
              cart.items.map((item) => {
                const availableStock = item.food.stockQuantity ?? 50;
                const exceedsStock = item.quantity > availableStock || availableStock <= 0;
                return (
                  <div key={item.food.id} className="flex justify-between gap-3 text-sm">
                    <span>
                      {item.quantity} x {item.food.name}
                      <small className={`mt-1 block font-bold ${exceedsStock ? "text-red-400" : "text-zinc-500"}`}>
                        {availableStock <= 0 ? "Out of stock" : `${availableStock} in stock`}
                      </small>
                    </span>
                    <strong>{formatCurrency(item.food.price * item.quantity)}</strong>
                  </div>
                );
              })
            )}
            <div className="space-y-2 border-t border-zinc-200 pt-4 text-sm dark:border-white/10">
              <Line label="Subtotal" value={formatCurrency(cart.subtotal)} />
              <Line label="Delivery" value={deliveryMode === "delivery" ? formatCurrency(cart.deliveryFee) : "No delivery fee"} />
              <Line label="Tax" value={formatCurrency(cart.tax)} />
              <Line label={deliveryMode === "delivery" ? "Estimated delivery" : "Ready time"} value={deliveryMode === "delivery" ? "30-45 min" : selectedTime.label} />
              <Line label="Total" value={formatCurrency(orderTotal)} strong />
            </div>
            <div className="rounded-2xl border border-savoury-primary/20 bg-savoury-accent p-4 text-sm text-zinc-700 dark:border-savoury-secondary/20 dark:bg-savoury-secondary/10 dark:text-zinc-200">
              <div className="flex items-center gap-2 font-black text-zinc-950 dark:text-white">
                <ShoppingBag size={18} className="text-savoury-secondary" />
                {deliveryMode === "pickup" ? "Pickup order" : deliveryMode === "dining" ? "Dining order" : "Delivery order"}
              </div>
              <p className="mt-1 text-zinc-600 dark:text-zinc-400">
                {deliveryMode === "pickup"
                  ? "Collect your food at Savoury Restaurant."
                  : deliveryMode === "dining"
                    ? "Your table meal request goes to the kitchen after confirmation."
                    : "Your order goes to the kitchen after confirmation."}
              </p>
            </div>
            {hasStockIssue && <p className="text-sm font-bold text-red-400">Some cart items exceed available stock.</p>}
            <Button className="w-full" size="lg" onClick={placeOrder} disabled={cart.items.length === 0 || hasStockIssue || placingOrder}>
              {placingOrder ? "Placing order..." : "Place Order"}
            </Button>
          </CardContent>
        </Card>
      </aside>
    </main>
  );
}

function Line({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return <div className={`flex justify-between ${strong ? "text-lg font-black text-zinc-950 dark:text-white" : "text-zinc-600 dark:text-zinc-400"}`}><span>{label}</span><span>{value}</span></div>;
}

function FulfillmentButton({ active, icon: Icon, title, note, onClick }: { active: boolean; icon: LucideIcon; title: string; note: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-20 items-center gap-3 rounded-xl border px-4 py-3 text-left transition ${
        active ? "border-savoury-primary bg-savoury-accent text-savoury-primary shadow-soft dark:border-savoury-secondary dark:bg-savoury-secondary dark:text-zinc-950" : "border-transparent bg-white text-zinc-700 hover:border-savoury-primary hover:text-savoury-primary dark:bg-white/5 dark:text-zinc-300 dark:hover:text-white"
      }`}
    >
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${active ? "bg-savoury-primary text-white dark:bg-zinc-950 dark:text-savoury-secondary" : "bg-savoury-accent text-savoury-primary dark:bg-white/10 dark:text-savoury-secondary"}`}>
        <Icon size={20} />
      </span>
      <span>
        <span className="block font-black">{title}</span>
        <span className={`block text-xs font-bold ${active ? "text-savoury-primary/75 dark:text-zinc-800" : "text-zinc-500"}`}>{note}</span>
      </span>
    </button>
  );
}

function PaymentCard({ active, icon: Icon, title, onClick }: { active: boolean; icon: LucideIcon; title: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border p-4 text-left transition ${
        active ? "border-savoury-primary bg-savoury-accent text-savoury-primary dark:border-savoury-secondary dark:bg-savoury-secondary dark:text-zinc-950" : "border-zinc-200 bg-white text-zinc-700 hover:border-savoury-primary hover:text-savoury-primary dark:border-white/10 dark:bg-[#101010] dark:text-zinc-300 dark:hover:text-white"
      }`}
    >
      <Icon size={20} />
      <span className="mt-3 block font-black">{title}</span>
    </button>
  );
}

function getTimeOptions(mode: DeliveryMode) {
  const now = new Date();
  const formatTime = (minutesFromNow: number) => {
    const time = new Date(now);
    time.setMinutes(time.getMinutes() + minutesFromNow);
    return time.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  };

  if (mode === "delivery") {
    return [
      { id: "asap", label: "ASAP 30-45 min", description: "Fastest available rider dispatch." },
      { id: "one-hour", label: `Today ${formatTime(60)}`, description: "Scheduled delivery in about 1 hour." },
      { id: "two-hours", label: `Today ${formatTime(120)}`, description: "Scheduled delivery in about 2 hours." },
      { id: "evening", label: "Today 7:00 PM", description: "Ideal for dinner delivery." },
    ];
  }

  if (mode === "pickup") {
    return [
      { id: "asap", label: "ASAP 20-30 min", description: "Kitchen prepares it as soon as possible." },
      { id: "forty-five", label: `Today ${formatTime(45)}`, description: "Pickup in about 45 minutes." },
      { id: "ninety", label: `Today ${formatTime(90)}`, description: "Pickup in about 90 minutes." },
      { id: "evening", label: "Today 7:30 PM", description: "Planned evening pickup." },
    ];
  }

  return [
    { id: "asap", label: "ASAP 25-35 min", description: "Prepare for dine-in as soon as possible." },
    { id: "lunch", label: "Today 1:00 PM", description: "Lunch dining slot." },
    { id: "dinner", label: "Today 7:00 PM", description: "Dinner dining slot." },
    { id: "late-dinner", label: "Today 8:30 PM", description: "Late dinner dining slot." },
  ];
}
