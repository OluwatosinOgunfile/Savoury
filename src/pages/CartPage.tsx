import { Link } from "react-router-dom";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { useCart } from "@/hooks/useCart";
import { formatCurrency } from "@/lib/utils";

export function CartPage() {
  const cart = useCart();
  const [couponCode, setCouponCode] = useState("");
  const [couponMessage, setCouponMessage] = useState("");

  const submitCoupon = () => {
    const applied = cart.applyCoupon(couponCode);
    setCouponMessage(applied ? "Coupon applied successfully." : "Coupon is invalid or minimum order was not reached.");
  };

  return (
    <main className="app-container grid gap-6 py-8 text-white lg:grid-cols-[1fr_380px]">
      <section>
        <h1 className="section-title">Shopping Cart</h1>
        <div className="mt-5 space-y-4">
          {cart.items.length === 0 ? (
            <Card className="dark-surface"><CardContent className="p-8 text-center text-zinc-400">Your cart is empty. Fresh meals are waiting.</CardContent></Card>
          ) : (
            cart.items.map(({ food, quantity }) => (
              <Card key={food.id} className="dark-surface">
                <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <img src={food.image} alt={food.name} className="h-28 w-full rounded-xl object-cover sm:w-32" />
                  <div className="flex-1">
                    <h2 className="font-black text-white">{food.name}</h2>
                    <p className="mt-1 text-sm text-zinc-400">{food.category} | {food.prepTime} min</p>
                    <p className="mt-2 font-black text-savoury-primary">{formatCurrency(food.price)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={() => cart.setQuantity(food.id, quantity - 1)}><Minus className="h-4 w-4" /></Button>
                    <span className="grid h-11 w-12 place-items-center rounded-xl bg-zinc-100 font-black dark:bg-white/10">{quantity}</span>
                    <Button variant="outline" size="icon" onClick={() => cart.setQuantity(food.id, quantity + 1)}><Plus className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => cart.removeItem(food.id)} aria-label={`Remove ${food.name}`}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </section>
      <aside className="h-fit lg:sticky lg:top-24">
        <Card className="dark-surface">
          <CardContent className="space-y-5">
            <h2 className="text-xl font-black">Order Summary</h2>
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <Input placeholder="Apply coupon" value={couponCode} onChange={(event) => setCouponCode(event.target.value)} />
              <Button variant="secondary" onClick={submitCoupon}>Apply</Button>
            </div>
            {couponMessage && <p className="text-sm font-bold text-savoury-primary">{couponMessage}</p>}
            <SummaryLine label="Subtotal" value={formatCurrency(cart.subtotal)} />
            <SummaryLine label="Delivery fee" value={formatCurrency(cart.deliveryFee)} />
            <SummaryLine label="Tax" value={formatCurrency(cart.tax)} />
            <SummaryLine label="Discount" value={`-${formatCurrency(cart.discount)}`} />
            <div className="border-t border-white/10 pt-4">
              <SummaryLine label="Total" value={formatCurrency(cart.total)} strong />
            </div>
            <Link to="/checkout"><Button className="w-full" size="lg" disabled={cart.items.length === 0}>Proceed to Checkout</Button></Link>
          </CardContent>
        </Card>
      </aside>
    </main>
  );
}

function SummaryLine({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return <div className={`flex items-center justify-between ${strong ? "text-lg font-black text-white" : "text-sm text-zinc-400"}`}><span>{label}</span><span>{value}</span></div>;
}
