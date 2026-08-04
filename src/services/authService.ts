import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { appEnv } from "@/lib/env";
import { isUserRole, postLoginPath } from "@/lib/roleAccess";

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
    if (!appEnv.demoAuthEnabled) {
      throw new Error("Authentication is not configured. Add VITE_SUPABASE_ANON_KEY to .env.local and restart the app.");
    }
    localStorage.setItem("savoury-demo-user", JSON.stringify({ email, fullName: "Demo Customer" }));
    window.dispatchEvent(new Event("savoury-auth-changed"));
    return { email };
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.user;
}

export async function getPostLoginPath(userId: string | undefined, fallbackPath: string) {
  if (appEnv.demoAuthEnabled && !isSupabaseConfigured) {
    try {
      const stored = JSON.parse(localStorage.getItem("savoury-demo-user") || "{}") as { role?: string };
      if (isUserRole(stored.role)) return postLoginPath(stored.role, fallbackPath);
    } catch {
      return "/account";
    }
  }

  if (!isSupabaseConfigured || !supabase) {
    return postLoginPath("customer", fallbackPath);
  }

  if (!userId) return "/account";

  const { data: appUser, error } = await supabase
    .from("users")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw new Error("Your account role could not be verified. Please try signing in again.");
  const role = isUserRole(appUser?.role) ? appUser.role : "customer";
  if (role === "sales_rep") {
    const { data: salesRep, error: salesRepError } = await supabase
      .from("sales_representatives")
      .select("status, must_change_password")
      .eq("auth_user_id", userId)
      .maybeSingle();
    if (salesRepError) throw new Error("Your POS account status could not be verified. Contact an administrator.");
    if (salesRep?.status === "active" && salesRep.must_change_password) return "/change-password";
  }
  return postLoginPath(role, fallbackPath);
}

export async function completeFirstLoginPasswordChange(password: string) {
  if (!isSupabaseConfigured || !supabase) throw new Error("Authentication is not configured.");

  const { error: passwordError } = await supabase.auth.updateUser({ password });
  if (passwordError) throw passwordError;

  const { data, error } = await supabase.functions.invoke("manage-sales-rep", {
    body: { action: "complete_password_change" },
  });
  if (error || data?.error) {
    throw new Error(data?.error || error?.message || "The password changed, but the first-login requirement could not be cleared. Please retry.");
  }
}

export async function signUpWithEmail({ email, password, fullName, phone }: AuthCredentials) {
  if (!isSupabaseConfigured || !supabase) {
    if (!appEnv.demoAuthEnabled) {
      throw new Error("Authentication is not configured. Add VITE_SUPABASE_ANON_KEY to .env.local and restart the app.");
    }
    localStorage.setItem("savoury-demo-user", JSON.stringify({ email, fullName, phone }));
    window.dispatchEvent(new Event("savoury-auth-changed"));
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
    if (!appEnv.demoAuthEnabled) {
      throw new Error("Google authentication is not configured. Add VITE_SUPABASE_ANON_KEY to .env.local and restart the app.");
    }
    localStorage.setItem("savoury-demo-user", JSON.stringify({ email: "google.user@savoury.local", fullName: "Google Demo User" }));
    window.dispatchEvent(new Event("savoury-auth-changed"));
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
  if (!isSupabaseConfigured || !supabase) {
    throw new Error("Authentication is not configured. Add VITE_SUPABASE_ANON_KEY to .env.local and restart the app.");
  }
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${authRedirectUrl}/account`,
  });
  if (error) throw error;
}
