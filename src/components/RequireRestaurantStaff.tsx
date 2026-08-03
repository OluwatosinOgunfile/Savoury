import { type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Store } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { useAuth } from "@/hooks/useAuth";

export function RequireRestaurantStaff({ children }: { children: ReactNode }) {
  const { loading, isAuthenticated, profile } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <main className="app-container grid min-h-[50vh] place-items-center py-10">
        <Card className="max-w-md">
          <CardContent className="text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-savoury-primary border-t-transparent" />
            <p className="mt-4 font-black">Checking restaurant access...</p>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/restaurant/login" state={{ from: location }} replace />;
  }

  if (profile?.role !== "restaurant_staff" && profile?.role !== "admin") {
    return (
      <main className="app-container grid min-h-[60vh] place-items-center py-10">
        <Card className="max-w-lg">
          <CardContent className="text-center">
            <Store className="mx-auto h-12 w-12 text-savoury-primary" />
            <h1 className="mt-4 text-2xl font-black">Restaurant staff only</h1>
            <p className="mt-2 text-sm font-semibold text-zinc-500">
              Sign in with a restaurant staff account to use the sales dashboard.
            </p>
          </CardContent>
        </Card>
      </main>
    );
  }

  return <>{children}</>;
}
