import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { roleHomePath } from "@/lib/roleAccess";

export function RequireCustomer({ children, allowGuest = false }: { children: ReactNode; allowGuest?: boolean }) {
  const { loading, isAuthenticated, profile } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <main className="app-container grid min-h-[50vh] place-items-center py-10">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-savoury-primary border-t-transparent" />
      </main>
    );
  }

  if (!isAuthenticated && !allowGuest) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (isAuthenticated && profile?.role !== "customer") {
    return <Navigate to={roleHomePath(profile?.role)} replace />;
  }

  return <>{children}</>;
}
