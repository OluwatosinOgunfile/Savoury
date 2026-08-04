import { FormEvent, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Menu, Moon, Search, ShoppingCart, Sun, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";

const nav = [{ to: "/menu", label: "Menu" }];

export function Header({ darkMode, setDarkMode }: { darkMode: boolean; setDarkMode: (value: boolean) => void }) {
  const { itemCount } = useCart();
  const { profile, isAuthenticated, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const isOwnerAdmin = profile?.role === "admin";
  const isSalesRep = profile?.role === "sales_rep";
  const isCustomer = !isAuthenticated || profile?.role === "customer";
  const dashboardPath = isOwnerAdmin ? "/admin" : isSalesRep ? "/pos" : "/account";

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    const query = searchTerm.trim();
    navigate(query ? `/menu?search=${encodeURIComponent(query)}` : "/menu");
    setMobileOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/95 shadow-sm backdrop-blur-xl transition-colors dark:border-white/8 dark:bg-[#141414]/95 dark:shadow-[0_1px_0_rgba(85,107,47,0.22)]">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:gap-6 lg:px-8">
        <Link to={isAuthenticated ? dashboardPath : "/"} aria-label="Savoury home" className="flex shrink-0 items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-white p-1 shadow-sm ring-1 ring-zinc-200 transition-transform group-hover:scale-105 dark:ring-white/10">
            <img src="/images/savoury-logo-tight.jpeg" alt="Savoury logo" className="h-full w-full rounded-full object-contain" />
          </span>
          <span className="font-display text-xl font-bold tracking-tight text-zinc-950 dark:text-white">Savoury</span>
        </Link>

        <form onSubmit={submitSearch} className={`${isCustomer ? "md:flex" : "md:hidden"} hidden h-10 w-full max-w-md items-center gap-3 rounded-xl border border-zinc-100 bg-zinc-100 px-4 text-zinc-500 shadow-inner dark:border-white/5 dark:bg-[#2a2a2a] dark:text-zinc-400`}>
          <Search className="h-5 w-5" />
          <input
            className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-zinc-950 outline-none placeholder:text-zinc-500 dark:text-white lg:text-base"
            placeholder="Search meals..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </form>

        <div className="flex shrink-0 items-center gap-3 sm:gap-4 lg:gap-5">
          <nav className="hidden items-center gap-4 md:flex lg:gap-5">
            {isCustomer && nav.map((item) => (
              <NavLink key={item.to} to={item.to} className={({ isActive }) => `text-sm font-black transition lg:text-base ${isActive ? "text-zinc-950 dark:text-white" : "text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white"}`}>
                {item.label}
              </NavLink>
            ))}
            {isAuthenticated && isOwnerAdmin && (
              <NavLink to="/admin" className={({ isActive }) => `text-sm font-black transition lg:text-base ${isActive ? "text-zinc-950 dark:text-white" : "text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white"}`}>
                Admin
              </NavLink>
            )}
            {isAuthenticated && isSalesRep && (
              <NavLink to="/pos" className={({ isActive }) => `text-sm font-black transition lg:text-base ${isActive ? "text-zinc-950 dark:text-white" : "text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white"}`}>
                POS
              </NavLink>
            )}
          </nav>

          <button className="hidden rounded-full p-1 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-white/8 dark:hover:text-white md:inline-flex" aria-label="Toggle theme" onClick={() => setDarkMode(!darkMode)}>
            {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>

          {isCustomer && <Link to="/cart" className="relative rounded-full p-1 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-white/8 dark:hover:text-white" aria-label="Open cart">
            <ShoppingCart className="h-5 w-5" />
            {itemCount > 0 && <span className="absolute -right-2 -top-2 grid h-5 min-w-5 place-items-center rounded-full bg-savoury-secondary px-1 text-xs font-black text-zinc-950">{itemCount}</span>}
          </Link>}

          {isAuthenticated ? (
            <button className="hidden text-sm font-black text-zinc-500 transition hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white md:block lg:text-base" onClick={signOut}>Sign out</button>
          ) : (
            <Link to="/login" className="hidden text-sm font-black text-zinc-500 transition hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white md:block lg:text-base">Login</Link>
          )}

          <Link to={isAuthenticated ? dashboardPath : "/signup"} className="hidden rounded-xl bg-savoury-primary px-5 py-2.5 text-sm font-black text-white shadow-[0_10px_24px_rgba(85,107,47,0.3)] transition hover:-translate-y-0.5 hover:bg-[#445626] md:block">
            {isAuthenticated ? (isOwnerAdmin ? "Dashboard" : isSalesRep ? "POS" : (profile?.fullName || "Account").split(" ")[0]) : "Sign Up"}
          </Link>

          <Button className="text-zinc-950 hover:bg-zinc-100 dark:text-white dark:hover:bg-white/10 md:hidden" variant="ghost" size="icon" aria-label="Open mobile menu" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-zinc-200 bg-white/98 px-4 py-4 shadow-premium dark:border-white/10 dark:bg-[#171717]/98 md:hidden">
          {isCustomer && <form onSubmit={submitSearch} className="mb-3 flex h-12 items-center gap-2 rounded-2xl border border-zinc-100 bg-zinc-100 px-3 text-zinc-500 dark:border-white/5 dark:bg-[#2a2a2a] dark:text-zinc-400">
            <Search className="h-4 w-4" />
            <input className="min-w-0 flex-1 bg-transparent text-sm text-zinc-950 outline-none placeholder:text-zinc-500 dark:text-white" placeholder="Search meals..." value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} />
          </form>}
          <div className="grid gap-2">
            {isCustomer && <Link to="/menu" onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-3 text-sm font-black text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-white/10">Menu</Link>}
            {isAuthenticated && isOwnerAdmin && (
              <Link to="/admin" onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-3 text-sm font-black text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-white/10">Admin Dashboard</Link>
            )}
            {isAuthenticated && isSalesRep && (
              <Link to="/pos" onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-3 text-sm font-black text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-white/10">POS Dashboard</Link>
            )}
            <button onClick={() => setDarkMode(!darkMode)} className="flex items-center justify-between rounded-lg px-3 py-3 text-sm font-black text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-white/10">
              <span>{darkMode ? "Light Mode" : "Dark Mode"}</span>
              {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            {isAuthenticated ? (
              <>
                {profile?.role === "customer" && <Link to="/account" onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-3 text-sm font-black text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-white/10">Account</Link>}
                <Button variant="outline" onClick={() => { signOut(); setMobileOpen(false); }}>Sign out</Button>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link to="/login" onClick={() => setMobileOpen(false)}><Button className="w-full" variant="outline">Login</Button></Link>
                <Link to="/signup" onClick={() => setMobileOpen(false)}><Button className="w-full">Sign Up</Button></Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
