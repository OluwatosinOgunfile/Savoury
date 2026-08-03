import { FormEvent, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LockKeyhole, Mail, Store } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { signInWithEmail } from "@/services/authService";

const restaurantLoginSchema = z.object({
  email: z.string().email("Enter a valid restaurant staff email."),
  password: z.string().min(6, "Password must be at least 6 characters."),
});

export function RestaurantLoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || "/restaurant";

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    const parsed = restaurantLoginSchema.safeParse(form);
    if (!parsed.success) {
      setError(parsed.error.errors[0].message);
      return;
    }

    setLoading(true);
    try {
      await signInWithEmail(form);
      navigate(from, { replace: true });
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : "Restaurant login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="app-container grid min-h-[calc(100vh-5rem)] place-items-center py-10">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-premium dark:bg-zinc-950 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="relative hidden min-h-[520px] overflow-hidden bg-zinc-950 lg:block">
          <img src="/images/savoury-hero.png" alt="Restaurant counter" className="absolute inset-0 h-full w-full object-cover opacity-75" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-transparent" />
          <div className="absolute bottom-8 left-8 right-8 text-white">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-savoury-primary">
              <Store className="h-6 w-6" />
            </div>
            <h1 className="mt-4 text-3xl font-black">Restaurant Sales Dashboard</h1>
            <p className="mt-2 text-sm font-semibold text-zinc-300">
              For cashier and sales staff handling physical restaurant orders.
            </p>
          </div>
        </section>

        <section className="p-6 sm:p-10">
          <Card className="border-0 shadow-none">
            <CardContent className="space-y-6 p-0">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-savoury-primary">Restaurant access</p>
                <h1 className="mt-2 text-3xl font-black tracking-tight">Sign in to POS</h1>
                <p className="mt-2 text-sm font-semibold text-zinc-500">
                  Use this login for walk-in sales, dining orders, takeaway orders, and stock-aware checkout.
                </p>
              </div>

              <form className="space-y-4" onSubmit={submit}>
                <label className="grid gap-2 text-sm font-bold text-zinc-600 dark:text-zinc-300">
                  Staff email
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />
                    <Input
                      className="pl-11"
                      type="email"
                      value={form.email}
                      onChange={(event) => setForm({ ...form, email: event.target.value })}
                    />
                  </div>
                </label>
                <label className="grid gap-2 text-sm font-bold text-zinc-600 dark:text-zinc-300">
                  Password
                  <div className="relative">
                    <LockKeyhole className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />
                    <Input
                      className="pl-11"
                      type="password"
                      value={form.password}
                      onChange={(event) => setForm({ ...form, password: event.target.value })}
                    />
                  </div>
                </label>
                {error && <p className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-600 dark:bg-red-500/10">{error}</p>}
                <Button className="w-full" size="lg" disabled={loading}>
                  {loading ? "Signing in..." : "Open Restaurant Dashboard"}
                </Button>
              </form>

              <div className="rounded-2xl border border-savoury-primary/15 bg-savoury-accent p-4 text-sm font-bold text-savoury-primary dark:bg-savoury-primary/10">
                Demo restaurant login: restaurant@savoury.local / restaurant123
              </div>

              <Link to="/login" className="inline-flex text-sm font-black text-zinc-500 transition hover:text-savoury-primary">
                Customer/admin login
              </Link>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}
