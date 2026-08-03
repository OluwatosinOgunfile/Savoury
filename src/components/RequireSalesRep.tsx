import { type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { BadgeDollarSign } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { useAuth } from "@/hooks/useAuth";

export function RequireSalesRep({ children }: { children: ReactNode }) {
  const { loading, isAuthenticated, profile } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <main className="app-container grid min-h-[50vh] place-items-center py-10">
        <Card className="max-w-md">
          <CardContent className="text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-savoury-primary border-t-transparent" />
            <p className="mt-4 font-black">Checking POS access...</p>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />;

  if (profile?.role !== "sales_rep") {
    return (
      <main className="app-container grid min-h-[60vh] place-items-center py-10">
        <Card className="max-w-lg">
          <CardContent className="text-center">
            <BadgeDollarSign className="mx-auto h-12 w-12 text-savoury-primary" />
            <h1 className="mt-4 text-2xl font-black">Sales representative access only</h1>
            <p className="mt-2 text-sm font-semibold text-zinc-500">Sign in with a POS staff account to use the counter sales dashboard.</p>
          </CardContent>
        </Card>
      </main>
    );
  }

  return <>{children}</>;
}
