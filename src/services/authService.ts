import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { appEnv } from "@/lib/env";

export interface AuthCredentials {
  email: string;
  password: string;
  fullName?: string;
  phone?: string;
}

const authRedirectUrl = appEnv.authRedirectUrl;

function callbackUrl() {
  const normalizedUrl = authRedirectUrl.replace(/\/$/, "");
  return normalizedUrl.endsWith("/auth/callback") ? normalizedUrl : `${normalizedUrl}/auth/callback`;
}

export async function signInWithEmail({ email, password }: AuthCredentials) {
  if (!isSupabaseConfigured || !supabase) {
    localStorage.setItem("savoury-demo-user", JSON.stringify({ email, fullName: "Demo Customer" }));
    return { email };
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.user;
}

export async function getPostLoginPath(userId: string | undefined, email: string, fallbackPath: string) {
  try {
    const stored = JSON.parse(localStorage.getItem("savoury-demo-user") || "{}") as { role?: string };
    if (stored.role === "admin") return "/admin";
  } catch {
    // Continue to Supabase role lookup.
  }

  if (!isSupabaseConfigured || !supabase) {
    return fallbackPath;
  }

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
