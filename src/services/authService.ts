import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { appEnv } from "@/lib/env";

export interface AuthCredentials {
  email: string;
  password: string;
  fullName?: string;
  phone?: string;
}

const authRedirectUrl = appEnv.authRedirectUrl;
const DEMO_ADMIN_EMAIL = "admin@savoury.local";
const DEMO_ADMIN_PASSWORD = "admin123";
const RESTAURANT_POS_EMAIL = "restaurant@savoury.ng";
const RESTAURANT_POS_PASSWORD = "Restaurant@2026!";

function callbackUrl() {
  const normalizedUrl = authRedirectUrl.replace(/\/$/, "");
  return normalizedUrl.endsWith("/auth/callback") ? normalizedUrl : `${normalizedUrl}/auth/callback`;
}

export async function signInWithEmail({ email, password }: AuthCredentials) {
  const normalizedEmail = email.trim().toLowerCase();
  if (normalizedEmail === RESTAURANT_POS_EMAIL && password === RESTAURANT_POS_PASSWORD) {
    localStorage.setItem(
      "savoury-demo-user",
      JSON.stringify({ email: normalizedEmail, fullName: "Restaurant POS", role: "restaurant_staff", staffRole: "staff" })
    );
    window.dispatchEvent(new Event("savoury-demo-auth-updated"));
    return { email: normalizedEmail };
  }

  if (!isSupabaseConfigured || !supabase) {
    if (email === DEMO_ADMIN_EMAIL && password === DEMO_ADMIN_PASSWORD) {
      localStorage.setItem(
        "savoury-demo-user",
        JSON.stringify({ email, fullName: "Savoury Admin", role: "admin" })
      );
      return { email };
    }

    localStorage.setItem("savoury-demo-user", JSON.stringify({ email, fullName: "Demo Customer" }));
    return { email };
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.user;
}

export async function getPostLoginPath(userId: string | undefined, email: string, fallbackPath: string) {
  try {
    const stored = JSON.parse(localStorage.getItem("savoury-demo-user") || "{}") as { role?: string; staffRole?: string };
    if (stored.role === "restaurant_staff") return "/restaurant";
    if (stored.role === "admin") return "/admin";
  } catch {
    // Continue to Supabase role lookup.
  }

  if (!isSupabaseConfigured || !supabase) {
    return fallbackPath;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const { data: staffMember } = await supabase
    .from("staff_members")
    .select("role, status")
    .eq("email", normalizedEmail)
    .neq("status", "inactive")
    .maybeSingle();

  if (staffMember?.role && staffMember.role !== "admin") return "/restaurant";

  if (!userId) return fallbackPath;

  const { data: appUser } = await supabase
    .from("users")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (appUser?.role === "admin") return "/admin";
  return fallbackPath;
}

export async function signUpWithEmail({ email, password, fullName, phone }: AuthCredentials) {
  if (!isSupabaseConfigured || !supabase) {
    localStorage.setItem("savoury-demo-user", JSON.stringify({ email, fullName, phone }));
    return { email, fullName, phone };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        phone,
      },
      emailRedirectTo: callbackUrl(),
    },
  });
  if (error) throw error;
  return data;
}

export async function signInWithGoogle() {
  if (!isSupabaseConfigured || !supabase) {
    localStorage.setItem("savoury-demo-user", JSON.stringify({ email: "google.user@savoury.local", fullName: "Google Demo User" }));
    return;
  }

  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: callbackUrl(),
      queryParams: {
        access_type: "offline",
        prompt: "consent",
      },
    },
  });
  if (error) throw error;
}

export async function sendPasswordReset(email: string) {
  if (!isSupabaseConfigured || !supabase) return;
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${authRedirectUrl}/account`,
  });
  if (error) throw error;
}
