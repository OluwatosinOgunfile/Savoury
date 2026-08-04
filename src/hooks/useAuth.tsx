import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { appEnv } from "@/lib/env";
import type { UserRole } from "@/types";
import { isUserRole } from "@/lib/roleAccess";

export interface AuthProfile {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  role: UserRole;
  accountStatus: "active" | "suspended" | "unprovisioned";
  permissions: string[];
  mustChangePassword: boolean;
  loyaltyPoints: number;
}

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: AuthProfile | null;
  loading: boolean;
  isAuthenticated: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function demoProfile(): AuthProfile | null {
  const stored = localStorage.getItem("savoury-demo-user");
  if (!stored) return null;
  let user: { email: string; fullName?: string; phone?: string; role?: UserRole };
  try {
    user = JSON.parse(stored);
  } catch {
    localStorage.removeItem("savoury-demo-user");
    return null;
  }
  return {
    id: "demo-user",
    email: user.email,
    fullName: user.fullName || "Demo Customer",
    phone: user.phone,
    role: isUserRole(user.role) ? user.role : "customer",
    accountStatus: "active",
    permissions: [],
    mustChangePassword: false,
    loyaltyPoints: 250,
  };
}

function profileFromUser(user: User): AuthProfile {
  return {
    id: user.id,
    email: user.email || "",
    fullName:
      user.user_metadata.full_name ||
      user.user_metadata.name ||
      user.email?.split("@")[0] ||
      "Savoury Customer",
    phone: user.user_metadata.phone,
    avatarUrl: user.user_metadata.avatar_url,
    role: "customer",
    accountStatus: "active",
    permissions: [],
    mustChangePassword: false,
    loyaltyPoints: 0,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const authRevision = useRef(0);

  const resolveProfile = useCallback(async (activeUser: User | null): Promise<AuthProfile | null> => {
    if (!isSupabaseConfigured || !supabase) {
      return appEnv.demoAuthEnabled ? demoProfile() : null;
    }

    if (!activeUser) {
      return null;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, phone, avatar_url, loyalty_points, users(email, role)")
      .eq("id", activeUser.id)
      .maybeSingle();

    if (error || !data) {
      return profileFromUser(activeUser);
    }

    const appUser = Array.isArray(data.users) ? data.users[0] : data.users;
    const baseRole: UserRole = isUserRole(appUser?.role) ? appUser.role : "customer";
    let accountStatus: AuthProfile["accountStatus"] = "active";
    let permissions: string[] = [];
    let mustChangePassword = false;
    let resolvedFullName = data.full_name;

    if (baseRole === "sales_rep") {
      const { data: salesRep, error: salesRepError } = await supabase
        .from("sales_representatives")
        .select("full_name, status, permissions, must_change_password")
        .eq("auth_user_id", activeUser.id)
        .maybeSingle();

      accountStatus = salesRepError || !salesRep ? "unprovisioned" : salesRep.status === "active" ? "active" : "suspended";
      permissions = Array.isArray(salesRep?.permissions) ? salesRep.permissions : [];
      mustChangePassword = salesRep?.must_change_password === true;
      resolvedFullName = salesRep?.full_name?.trim() || resolvedFullName;
    }

    return {
      id: data.id,
      fullName: resolvedFullName,
      phone: data.phone || undefined,
      avatarUrl: data.avatar_url || undefined,
      loyaltyPoints: data.loyalty_points || 0,
      email: appUser?.email || activeUser.email || "",
      role: baseRole,
      accountStatus,
      permissions,
      mustChangePassword,
    };
  }, []);

  const syncSession = useCallback(async (nextSession: Session | null) => {
    const revision = ++authRevision.current;
    setLoading(true);
    setSession(nextSession);
    setUser(nextSession?.user || null);
    const nextProfile = await resolveProfile(nextSession?.user || null);
    if (revision !== authRevision.current) return;
    setProfile(nextProfile);
    setLoading(false);
  }, [resolveProfile]);

  const refreshProfile = async () => {
    const nextProfile = await resolveProfile(user);
    setProfile(nextProfile);
  };

  const signOut = async () => {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    }
    localStorage.removeItem("savoury-demo-user");
    setSession(null);
    setUser(null);
    setProfile(null);
    window.dispatchEvent(new Event("savoury-auth-changed"));
  };

  useEffect(() => {
    let mounted = true;

    const boot = async () => {
      if (!isSupabaseConfigured || !supabase) {
        if (!mounted) return;
        setProfile(appEnv.demoAuthEnabled ? demoProfile() : null);
        setLoading(false);
        return;
      }

      const { data } = await supabase.auth.getSession();
      if (mounted) await syncSession(data.session);
    };

    boot();

    if (!isSupabaseConfigured || !supabase) {
      const handleDemoAuth = () => {
        if (!appEnv.demoAuthEnabled) return;
        setProfile(demoProfile());
        setLoading(false);
      };
      window.addEventListener("savoury-auth-changed", handleDemoAuth);
      return () => {
        mounted = false;
        window.removeEventListener("savoury-auth-changed", handleDemoAuth);
      };
    }

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      const revision = ++authRevision.current;
      setLoading(true);
      setSession(nextSession);
      setUser(nextSession?.user || null);
      setProfile(null);

      window.setTimeout(async () => {
        const nextProfile = await resolveProfile(nextSession?.user || null);
        if (revision !== authRevision.current) return;
        setProfile(nextProfile);
        setLoading(false);
      }, 0);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [resolveProfile, syncSession]);

  const value = useMemo(
    () => ({
      user,
      session,
      profile,
      loading,
      isAuthenticated: Boolean(user || profile),
      refreshProfile,
      signOut,
    }),
    [user, session, profile, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
