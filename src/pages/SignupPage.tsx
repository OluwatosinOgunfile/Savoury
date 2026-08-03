import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Chrome, LockKeyhole, Mail, Phone, User, type LucideIcon } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { isSupabaseConfigured } from "@/lib/supabase";
import { signInWithGoogle, signUpWithEmail } from "@/services/authService";

const signupSchema = z.object({
  fullName: z.string().min(2, "Enter your full name."),
  phone: z.string().min(7, "Enter a valid phone number."),
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export function SignupPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullName: "", phone: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setMessage("");
    const parsed = signupSchema.safeParse(form);
    if (!parsed.success) {
      setError(parsed.error.errors[0].message);
      return;
    }
    setLoading(true);
    try {
      const data = await signUpWithEmail(form);
      if (isSupabaseConfigured && data && "session" in data && !data.session) {
        setMessage("Account created. Check your email to confirm your Savoury account.");
      } else {
        navigate("/account");
      }
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : "Signup failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const continueWithGoogle = async () => {
    setError("");
    try {
      await signInWithGoogle();
      if (!isSupabaseConfigured) navigate("/account");
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : "Google sign-in failed. Please try again.");
    }
  };

  return (
    <main className="app-container grid min-h-[calc(100vh-5rem)] place-items-center py-10">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-xl bg-white shadow-premium dark:bg-zinc-950 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="p-6 sm:p-10">
          <Card className="border-0 shadow-none">
            <CardContent className="space-y-6 p-0">
              <div>
                <p className="font-black uppercase text-savoury-primary">Create account</p>
                <h1 className="mt-2 text-3xl font-black tracking-tight">Join Savoury Rewards</h1>
                <p className="mt-2 text-sm text-zinc-500">Save addresses, collect loyalty points, unlock referral rewards, and order faster.</p>
              </div>
              <Button type="button" variant="outline" className="w-full" size="lg" onClick={continueWithGoogle}>
                <Chrome className="h-5 w-5" />
                Sign up with Google
              </Button>
              <div className="flex items-center gap-3 text-xs font-black uppercase text-zinc-400">
                <span className="h-px flex-1 bg-zinc-100 dark:bg-white/10" />
                or email
                <span className="h-px flex-1 bg-zinc-100 dark:bg-white/10" />
              </div>
              <form className="grid gap-4" onSubmit={submit}>
                <Field icon={User} label="Full name" value={form.fullName} onChange={(value) => setForm({ ...form, fullName: value })} />
                <Field icon={Phone} label="Phone number" value={form.phone} onChange={(value) => setForm({ ...form, phone: value })} />
                <Field icon={Mail} label="Email" type="email" value={form.email} onChange={(value) => setForm({ ...form, email: value })} />
                <Field icon={LockKeyhole} label="Password" type="password" value={form.password} onChange={(value) => setForm({ ...form, password: value })} />
                {error && <p className="rounded-xl bg-red-50 p-3 text-sm font-bold text-savoury-primary">{error}</p>}
                {message && <p className="rounded-xl bg-savoury-accent p-3 text-sm font-bold text-savoury-primary">{message}</p>}
                <Button className="w-full" size="lg" disabled={loading}>{loading ? "Creating account..." : "Create account"}</Button>
              </form>
              <p className="text-sm font-bold text-zinc-500">
                Already have an account? <Link to="/login" className="text-savoury-primary">Sign in</Link>
              </p>
            </CardContent>
          </Card>
        </section>
        <section className="relative hidden min-h-[660px] overflow-hidden lg:block">
          <img src="/images/savoury-hero.png" alt="Savoury premium meals" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
          <div className="absolute bottom-8 left-8 right-8 text-white">
            <p className="font-black uppercase text-savoury-secondary">Fast ordering</p>
            <h2 className="mt-2 text-3xl font-black md:text-4xl">Your favorite meals, rewards, and saved addresses in one place.</h2>
          </div>
        </section>
      </div>
    </main>
  );
}

function Field({ icon: Icon, label, value, onChange, type = "text" }: { icon: LucideIcon; label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <label className="grid gap-2 text-sm font-bold text-zinc-600 dark:text-zinc-300">
      {label}
      <div className="relative">
        <Icon className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />
        <Input className="pl-11" type={type} value={value} onChange={(event) => onChange(event.target.value)} />
      </div>
    </label>
  );
}
