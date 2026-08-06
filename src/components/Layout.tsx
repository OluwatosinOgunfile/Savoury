import { Outlet } from "react-router-dom";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { FloatingCart } from "@/components/FloatingCart";
import { Footer } from "@/components/Footer";
import { ScrollToTop } from "@/components/ScrollToTop";
import { PullToRefresh } from "@/components/PullToRefresh";

export function Layout({ darkMode, setDarkMode }: { darkMode: boolean; setDarkMode: (value: boolean) => void }) {
  return (
    <div className="min-h-screen bg-savoury-background pb-20 text-zinc-950 transition-colors dark:bg-[#101010] dark:text-white lg:pb-0">
      <ScrollToTop />
      <PullToRefresh />
      <Header darkMode={darkMode} setDarkMode={setDarkMode} />
      <Outlet />
      <Footer />
      <FloatingCart />
      <BottomNav />
    </div>
  );
}
