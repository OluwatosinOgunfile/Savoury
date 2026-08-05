import { Link } from "react-router-dom";
import { ShoppingBag } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "@/hooks/useCart";
import { formatCurrency } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

export function FloatingCart() {
  const { itemCount, total } = useCart();
  const { profile } = useAuth();

  if (profile?.role === "admin" || profile?.role === "sales_rep" || profile?.role === "kitchen") return null;

  return (
    <AnimatePresence>
      {itemCount > 0 && (
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 30 }} className="fixed bottom-24 right-4 z-50 lg:bottom-6 lg:right-6">
          <Link to="/cart" className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3 font-black text-zinc-950 shadow-premium dark:border-white/10 dark:bg-[#202020] dark:text-white">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-savoury-primary text-white">
              <ShoppingBag className="h-5 w-5" />
            </span>
            <span>{itemCount} items</span>
            <span className="text-savoury-secondary">{formatCurrency(total)}</span>
          </Link>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
