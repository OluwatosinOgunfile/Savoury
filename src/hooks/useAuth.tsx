import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import type { StaffRole, UserRole } from "@/types";

export interface AuthProfile {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  role: UserRole;
  staffRole?: StaffRole;
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
  const user = JSON.parse(stored) as { email: string; fullName?: string; phone?: string; role?: UserRole; staffRole?: StaffRole };
  return {
    id: "demo-user",
    email: user.email,
    fullName: user.fullName || "Demo Customer",
    phone: user.phone,
    role: user.role === "admin" || user.role === "restaurant_staff" ? user.role : "customer",
    staffRole: user.staffRole,
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
    loyaltyPoints: 0,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (activeUser: User | null) => {
    if (!isSupabaseConfigured || !supabase) {
      setProfile(demoProfile());
      return;
    }

    if (!activeUser) {
      setProfile(demoProfile());
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, phone, avatar_url, loyalty_points, users(email, role)")
      .eq("id", activeUser.id)
      .maybeSingle();

    if (error || !data) {
      setProfile(profileFromUser(activeUser));
      return;
    }

    const appUser = Array.isArray(data.users) ? data.users[0] : data.users;
    let staffRole: StaffRole | undefined;
    if (appUser?.email) {
      const { data: staffMember } = await supabase
        .from("staff_members")
        .select("role")
        .eq("email", appUser.email)
        .neq("status", "inactive")
        .maybeSingle();
      staffRole = staffMember?.role as StaffRole | undefined;
    }

    const baseRole = (appUser?.role || "customer") as UserRole;
    const visibleRole = baseRole === "admin" && staffRole && staffRole !== "admin" ? "restaurant_staff" : baseRole;

    setProfile({
      id: data.id,
      fullName: data.full_name,
      phone: data.phone || undefined,
      avatarUrl: data.avatar_url || undefined,
      loyaltyPoints: data.loyalty_points || 0,
      email: appUser?.email || activeUser.email || "",
      role: visibleRole,
      staffRole,
    });
  };

  const refreshProfile = async () => {
    await loadProfile(user);
  };

  const signOut = async () => {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    }
    localStorage.removeItem("savoury-demo-user");
    setSession(null);
    setUser(null);
    setProfile(null);
  };

  useEffect(() => {
    let mounted = true;

    const boot = async () => {
      if (!isSupabaseConfigured || !supabase) {
        if (!mounted) return;
        setProfile(demoProfile());
        setLoading(false);
        return;
      }

      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setSession(data.session);
      setUser(data.session?.user || null);
      await loadProfile(data.session?.user || null);
      if (mounted) setLoading(false);
    };

    boot();

    if (!isSupabaseConfigured || !supabase) {
      return () => {
        mounted = false;
      };
    }

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user || null);
      loadProfile(nextSession?.user || null);
    });

    const handleDemoAuth = () => {
      setSession(null);
      setUser(null);
      setProfile(demoProfile());
    };
    window.addEventListener("savoury-demo-auth-updated", handleDemoAuth);

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
      window.removeEventListener("savoury-demo-auth-updated", handleDemoAuth);
    };
  }, []);

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
