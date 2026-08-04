import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export function RequireKitchen({ children }: { children: ReactNode }) {
  const { loading, isAuthenticated, profile } = useAuth();
  const location = useLocation();
  if (loading) return <main className="app-container grid min-h-[60vh] place-items-center"><div className="h-10 w-10 animate-spin rounded-full border-2 border-savoury-primary border-t-transparent" /></main>;
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />;
  if (profile?.role === "kitchen" && profile.accountStatus === "active" && profile.mustChangePassword) return <Navigate to="/change-password" replace />;
  if (profile?.role !== "kitchen") return <Navigate to={profile?.role === "admin" ? "/admin" : profile?.role === "sales_rep" ? "/pos" : "/account"} replace />;
  if (profile.accountStatus !== "active") {
    return <main className="app-container grid min-h-[60vh] place-items-center py-10"><div className="max-w-lg rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-center"><h1 className="text-2xl font-black">Kitchen account unavailable</h1><p className="mt-2 text-sm font-semibold text-zinc-500">This kitchen account is suspended or has not been fully provisioned. Contact an administrator.</p></div></main>;
  }
  return <>{children}</>;
}
