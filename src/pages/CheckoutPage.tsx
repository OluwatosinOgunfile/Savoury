import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
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
import { saveSubmittedOrder } from "@/services/orderStorage";
import { paymentProviders } from "@/services/payment";
import type { DeliveryMode, PaymentMethod } from "@/types";

const checkoutSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(7),
  address: z.string().min(5),
});

export function CheckoutPage() {
  const cart = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: savedAddresses = addresses } = useQuery({ queryKey: accountKeys.addresses(user?.id), queryFn: () => fetchUserAddresses(user?.id) });
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>("delivery");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");
  const [form, setForm] = useState({ name: "Guest Customer", phone: "+234 801 000 0000", address: addresses[0].line1, instructions: "", deliveryTime: "ASAP" });
  const [error, setError] = useState("");

  useEffect(() => {
    const defaultAddress = savedAddresses.find((address) => address.default) || savedAddresses[0];
    if (defaultAddress && form.address === addresses[0].line1) {
      setForm((current) => ({ ...current, address: defaultAddress.line1 }));
    }
  }, [form.address, savedAddresses]);

  const placeOrder = async () => {
    const parsed = checkoutSchema.safeParse(form);
    if (!parsed.success || cart.items.length === 0) {
      setError("Please complete customer information and add at least one meal.");
      return;
    }
    if (isSupabaseConfigured && !user) {
      setError("Please log in before placing an order so the restaurant can receive it.");
      return;
    }
    const total = deliveryMode === "pickup" ? cart.total - cart.deliveryFee : cart.total;
    await paymentProviders[paymentMethod === "card" ? "paystack" : paymentMethod].initialize({
      amount: total,
      email: "customer@savoury.local",
      reference: `SV-${Date.now()}`,
      method: paymentMethod,
    });
    const order = await saveSubmittedOrder({
      customerName: form.name,
      phone: form.phone,
      address: form.address,
      items: cart.items,
      paymentMethod,
      deliveryMode,
      total,
      subtotal: cart.subtotal,
      deliveryFee: deliveryMode === "pickup" ? 0 : cart.deliveryFee,
      tax: cart.tax,
      instructions: form.instructions,
      userId: user?.id,
    });
    cart.clearCart();
    navigate(`/track/${order.id}`);
  };

  return (
    <main className="app-container grid gap-6 py-8 text-white lg:grid-cols-[1fr_420px]">
      <section className="space-y-5">
        <div>
          <h1 className="section-title">Checkout</h1>
          <p className="mt-2 text-zinc-400">Customer details, saved addresses, delivery timing, payment, and order instructions.</p>
        </div>
        <Card className="dark-surface">
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Input placeholder="Customer name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
            <Input placeholder="Phone number" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
            <Input className="sm:col-span-2" placeholder="Delivery address" value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} />
            <select className="h-12 rounded-xl border border-white/10 bg-[#101010] px-4 text-sm text-white" value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })}>
              {savedAddresses.map((address) => <option key={address.id} value={address.line1}>{address.label}: {address.line1}</option>)}
            </select>
            <select className="h-12 rounded-xl border border-white/10 bg-[#101010] px-4 text-sm text-white" value={form.deliveryTime} onChange={(event) => setForm({ ...form, deliveryTime: event.target.value })}>
              <option>ASAP</option>
              <option>30 minutes</option>
              <option>1 hour</option>
              <option>Tonight 7:00 PM</option>
            </select>
            <div className="grid grid-cols-2 gap-2">
              {(["delivery", "pickup"] as DeliveryMode[]).map((mode) => (
                <Button key={mode} variant={deliveryMode === mode ? "primary" : "outline"} onClick={() => setDeliveryMode(mode)}>{mode}</Button>
              ))}
            </div>
            <Textarea className="sm:col-span-2" rows={4} placeholder="Special instructions" value={form.instructions} onChange={(event) => setForm({ ...form, instructions: event.target.value })} />
          </CardContent>
        </Card>
        <Card className="dark-surface">
          <CardContent>
            <h2 className="font-black">Payment Method</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {(["cash", "card", "transfer"] as PaymentMethod[]).map((method) => (
                <button key={method} onClick={() => setPaymentMethod(method)} className={`rounded-xl border p-4 text-left font-black capitalize transition ${paymentMethod === method ? "border-savoury-primary bg-savoury-primary/15 text-white" : "border-white/10 bg-[#101010] text-zinc-400 hover:text-white"}`}>{method}</button>
              ))}
            </div>
            <p className="mt-3 text-sm text-zinc-400">Card architecture is ready for Paystack, Flutterwave, and Stripe connection.</p>
          </CardContent>
        </Card>
        {error && <p className="font-bold text-savoury-primary">{error}</p>}
      </section>
      <aside className="h-fit lg:sticky lg:top-24">
        <Card className="dark-surface">
          <CardContent className="space-y-4">
            <h2 className="text-xl font-black">Order Summary</h2>
            {cart.items.map((item) => (
              <div key={item.food.id} className="flex justify-between gap-3 text-sm">
                <span>{item.quantity} x {item.food.name}</span>
                <strong>{formatCurrency(item.food.price * item.quantity)}</strong>
              </div>
            ))}
            <div className="space-y-2 border-t border-white/10 pt-4 text-sm">
              <Line label="Subtotal" value={formatCurrency(cart.subtotal)} />
              <Line label="Delivery" value={deliveryMode === "pickup" ? "Free pickup" : formatCurrency(cart.deliveryFee)} />
              <Line label="Tax" value={formatCurrency(cart.tax)} />
              <Line label="Estimated delivery" value={deliveryMode === "pickup" ? "20-30 min" : "30-45 min"} />
              <Line label="Total" value={formatCurrency(deliveryMode === "pickup" ? cart.total - cart.deliveryFee : cart.total)} strong />
            </div>
            <Button className="w-full" size="lg" onClick={placeOrder}>Place Order</Button>
          </CardContent>
        </Card>
      </aside>
    </main>
  );
}

function Line({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return <div className={`flex justify-between ${strong ? "text-lg font-black text-white" : "text-zinc-400"}`}><span>{label}</span><span>{value}</span></div>;
}
