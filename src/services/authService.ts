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
const DEMO_RESTAURANT_EMAIL = "restaurant@savoury.local";
const DEMO_RESTAURANT_PASSWORD = "restaurant123";

function callbackUrl() {
  const normalizedUrl = authRedirectUrl.replace(/\/$/, "");
  return normalizedUrl.endsWith("/auth/callback") ? normalizedUrl : `${normalizedUrl}/auth/callback`;
}

export async function signInWithEmail({ email, password }: AuthCredentials) {
  if (!isSupabaseConfigured || !supabase) {
    if (email === DEMO_ADMIN_EMAIL && password === DEMO_ADMIN_PASSWORD) {
      localStorage.setItem(
        "savoury-demo-user",
        JSON.stringify({ email, fullName: "Savoury Admin", role: "admin" })
      );
      return { email };
    }

    if (email === DEMO_RESTAURANT_EMAIL && password === DEMO_RESTAURANT_PASSWORD) {
      localStorage.setItem(
        "savoury-demo-user",
        JSON.stringify({ email, fullName: "Restaurant Cashier", role: "restaurant_staff", staffRole: "cashier" })
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
