import { type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { useAuth } from "@/hooks/useAuth";
import { PageLoader } from "@/components/PageLoader";

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { loading, isAuthenticated, profile } = useAuth();
  const location = useLocation();

  if (loading) return <PageLoader compact />;

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (profile?.role !== "admin") {
    return (
      <main className="app-container grid min-h-[60vh] place-items-center py-10">
        <Card className="max-w-lg">
          <CardContent className="text-center">
            <ShieldAlert className="mx-auto h-12 w-12 text-savoury-primary" />
            <h1 className="mt-4 text-2xl font-black">Admin access only</h1>
            <p className="mt-2 text-sm font-semibold text-zinc-500">
              This dashboard is only visible when you are signed in with an admin account.
            </p>
          </CardContent>
        </Card>
      </main>
    );
  }

  return <>{children}</>;
}
