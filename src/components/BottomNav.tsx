import { NavLink } from "react-router-dom";
import { Home, LayoutDashboard, ReceiptText, Search, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const items = [
  { to: "/", label: "Home", icon: Home },
  { to: "/menu", label: "Menu", icon: Search },
  { to: "/cart", label: "Cart", icon: ReceiptText },
  { to: "/account", label: "Account", icon: User },
];

export function BottomNav() {
  const { profile } = useAuth();
  const visibleItems =
    profile?.role === "admin"
      ? [{ to: "/admin", label: "Admin", icon: LayoutDashboard }]
      : profile?.role === "sales_rep"
        ? [{ to: "/pos", label: "POS", icon: LayoutDashboard }]
        : profile?.role === "kitchen"
          ? [{ to: "/kitchen", label: "Kitchen", icon: LayoutDashboard }]
        : items;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-white/95 shadow-[0_-8px_24px_rgba(0,0,0,0.06)] backdrop-blur-xl dark:border-white/10 dark:bg-[#151515]/95 dark:shadow-none lg:hidden">
      <div className={`grid ${visibleItems.length === 1 ? "grid-cols-1" : "grid-cols-4"}`}>
        {visibleItems.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className={({ isActive }) => `flex flex-col items-center gap-1 px-2 py-3 text-[11px] font-bold ${isActive ? "text-savoury-primary dark:text-savoury-secondary" : "text-zinc-500 dark:text-zinc-400"}`}>
            <Icon className="h-5 w-5" />
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
