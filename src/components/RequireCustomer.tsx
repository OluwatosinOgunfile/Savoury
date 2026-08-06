import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { roleHomePath } from "@/lib/roleAccess";
import { PageLoader } from "@/components/PageLoader";

export function RequireCustomer({ children, allowGuest = false }: { children: ReactNode; allowGuest?: boolean }) {
  const { loading, isAuthenticated, profile } = useAuth();
  const location = useLocation();

  if (loading) return <PageLoader compact />;

  if (!isAuthenticated && !allowGuest) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (isAuthenticated && profile?.role !== "customer") {
    return <Navigate to={roleHomePath(profile?.role)} replace />;
  }

  return <>{children}</>;
}
