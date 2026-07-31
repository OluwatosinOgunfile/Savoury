import { Link } from "react-router-dom";
import { Button } from "@/components/ui/Button";

export function NotFoundPage() {
  return (
    <main className="app-container grid min-h-[70vh] place-items-center py-10 text-center">
      <div>
        <p className="font-black text-savoury-primary">404</p>
        <h1 className="mt-2 text-4xl font-black">That Savoury page is not on the menu.</h1>
        <Link to="/menu" className="mt-6 inline-block"><Button>Browse meals</Button></Link>
      </div>
    </main>
  );
}
