import { FormEvent, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Chrome, LockKeyhole, Mail } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { isSupabaseConfigured } from "@/lib/supabase";
import { getPostLoginPath, sendPasswordReset, signInWithEmail, signInWithGoogle } from "@/services/authService";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(6, "Password must be at least 6 characters."),
});

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || "/account";

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setMessage("");
    const parsed = loginSchema.safeParse(form);
    if (!parsed.success) {
      setError(parsed.error.errors[0].message);
      return;
    }
    setLoading(true);
    try {
      const signedInUser = await signInWithEmail(form);
      const nextPath = await getPostLoginPath("id" in signedInUser ? signedInUser.id : undefined, form.email, from);
      navigate(nextPath, { replace: true });
    } catch (authError) {
      const authMessage = authError instanceof Error ? authError.message : "Login failed. Please try again.";
      setError(authMessage);
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async () => {
    setError("");
    if (!form.email) {
      setError("Enter your email address first.");
      return;
    }
    await sendPasswordReset(form.email);
    setMessage(isSupabaseConfigured ? "Password reset email sent." : "Password reset is ready once Supabase is configured.");
  };

  const continueWithGoogle = async () => {
    setError("");
    try {
      await signInWithGoogle();
      if (!isSupabaseConfigured) navigate(from, { replace: true });
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : "Google sign-in failed. Please try again.");
    }
  };

  return (
    <main className="app-container grid min-h-[calc(100vh-5rem)] place-items-center py-10">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-xl bg-white shadow-premium dark:bg-zinc-950 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="relative hidden min-h-[620px] overflow-hidden lg:block">
          <img src="/images/savoury-hero.png" alt="Savoury meals" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          <div className="absolute bottom-8 left-8 right-8 text-white">
            <p className="font-black uppercase text-savoury-secondary">Welcome back</p>
            <h1 className="mt-2 text-3xl font-black md:text-4xl">Fresh meals are one sign-in away.</h1>
          </div>
        </section>
        <section className="p-6 sm:p-10">
          <Card className="border-0 shadow-none">
            <CardContent className="space-y-6 p-0">
              <div>
                <p className="font-black uppercase text-savoury-primary">Login</p>
                <h1 className="mt-2 text-3xl font-black tracking-tight">Sign in to Savoury</h1>
                <p className="mt-2 text-sm text-zinc-500">Track orders, save addresses, earn rewards, and reorder favorites faster.</p>
              </div>
              <Button type="button" variant="outline" className="w-full" size="lg" onClick={continueWithGoogle}>
                <Chrome className="h-5 w-5" />
                Continue with Google
              </Button>
              <div className="flex items-center gap-3 text-xs font-black uppercase text-zinc-400">
                <span className="h-px flex-1 bg-zinc-100 dark:bg-white/10" />
                or email
                <span className="h-px flex-1 bg-zinc-100 dark:bg-white/10" />
              </div>
              <form className="space-y-4" onSubmit={submit}>
                <label className="grid gap-2 text-sm font-bold text-zinc-600 dark:text-zinc-300">
                  Email
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />
                    <Input className="pl-11" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
                  </div>
                </label>
                <label className="grid gap-2 text-sm font-bold text-zinc-600 dark:text-zinc-300">
                  Password
                  <div className="relative">
                    <LockKeyhole className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />
                    <Input className="pl-11" type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
                  </div>
                </label>
                {error && <p className="rounded-xl bg-red-50 p-3 text-sm font-bold text-savoury-primary">{error}</p>}
                {message && <p className="rounded-xl bg-savoury-accent p-3 text-sm font-bold text-savoury-primary">{message}</p>}
                <Button className="w-full" size="lg" disabled={loading}>{loading ? "Signing in..." : "Sign in"}</Button>
              </form>
              <div className="flex flex-col gap-3 text-sm font-bold text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
                <button className="text-left text-savoury-primary" onClick={resetPassword}>Forgot password?</button>
                <Link to="/signup" className="text-savoury-primary">Create an account</Link>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}
