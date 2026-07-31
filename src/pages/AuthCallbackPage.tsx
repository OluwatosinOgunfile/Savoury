import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { useAuth } from "@/hooks/useAuth";

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const { loading, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!loading && isAuthenticated) navigate("/account", { replace: true });
    if (!loading && !isAuthenticated) navigate("/login", { replace: true });
  }, [isAuthenticated, loading, navigate]);

  return (
    <main className="app-container grid min-h-[calc(100vh-5rem)] place-items-center py-10">
      <Card className="w-full max-w-md">
        <CardContent className="grid place-items-center gap-4 p-8 text-center">
          <Loader2 className="h-9 w-9 animate-spin text-savoury-primary" />
          <div>
            <h1 className="text-2xl font-black">Finishing sign in</h1>
            <p className="mt-2 text-sm text-zinc-500">Your Savoury account is being connected securely.</p>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
