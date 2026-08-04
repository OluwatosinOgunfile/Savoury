import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { KeyRound, LockKeyhole } from "lucide-react";
import { z } from "zod";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/hooks/useAuth";
import { completeFirstLoginPasswordChange } from "@/services/authService";

const passwordSchema = z
  .string()
  .min(10, "Use at least 10 characters.")
  .regex(/[a-z]/, "Include a lowercase letter.")
  .regex(/[A-Z]/, "Include an uppercase letter.")
  .regex(/[0-9]/, "Include a number.")
  .regex(/[^A-Za-z0-9]/, "Include a symbol.");

export function FirstLoginPasswordPage() {
  const navigate = useNavigate();
  const { loading, isAuthenticated, profile, refreshProfile, signOut } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  if (loading) return <main className="app-container grid min-h-[60vh] place-items-center"><div className="h-10 w-10 animate-spin rounded-full border-2 border-savoury-primary border-t-transparent" /></main>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (profile?.role !== "sales_rep") return <Navigate to={profile?.role === "admin" ? "/admin" : "/account"} replace />;
  if (profile.accountStatus !== "active") return <Navigate to="/pos" replace />;
  if (!profile.mustChangePassword) return <Navigate to="/pos" replace />;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    const parsed = passwordSchema.safeParse(password);
    if (!parsed.success) {
      setError(parsed.error.errors[0].message);
      return;
    }
    if (password !== confirmation) {
      setError("The passwords do not match.");
      return;
    }

    setSaving(true);
    try {
      await completeFirstLoginPasswordChange(password);
      await refreshProfile();
      navigate("/pos", { replace: true });
    } catch (changeError) {
      setError(changeError instanceof Error ? changeError.message : "Could not change the password.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="app-container grid min-h-[calc(100vh-5rem)] place-items-center py-10">
      <Card className="w-full max-w-lg border-savoury-primary/20 shadow-premium">
        <CardContent className="p-6 sm:p-8">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-savoury-primary text-white"><KeyRound className="h-6 w-6" /></div>
          <p className="mt-5 text-xs font-black uppercase tracking-[0.2em] text-savoury-primary">First login</p>
          <h1 className="mt-2 text-3xl font-black">Create your private password</h1>
          <p className="mt-2 text-sm font-semibold text-zinc-500">The temporary password has expired for dashboard access. Choose a password known only to you.</p>

          <form className="mt-6 grid gap-4" onSubmit={submit}>
            <label className="grid gap-2 text-sm font-black">New password<div className="relative"><LockKeyhole className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" /><Input className="pl-11" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} /></div></label>
            <label className="grid gap-2 text-sm font-black">Confirm password<div className="relative"><LockKeyhole className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" /><Input className="pl-11" type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></div></label>
            <p className="text-xs font-semibold text-zinc-500">At least 10 characters with uppercase, lowercase, number, and symbol.</p>
            {error && <p className="rounded-xl bg-red-500/10 p-3 text-sm font-bold text-red-500">{error}</p>}
            <Button size="lg" disabled={saving}>{saving ? "Securing account..." : "Change password and continue"}</Button>
            <Button type="button" variant="ghost" onClick={signOut}>Sign out</Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
