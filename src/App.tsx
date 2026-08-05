import { useEffect, useState } from "react";
import { Route, Routes } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { AccountPage } from "@/pages/AccountPage";
import { AdminDashboard } from "@/pages/AdminDashboard";
import { AdminActivityPage } from "@/pages/AdminActivityPage";
import { AdminFoodFormPage } from "@/pages/AdminFoodFormPage";
import { AdminManageMenuPage } from "@/pages/AdminManageMenuPage";
import { AdminOrderDetailsPage } from "@/pages/AdminOrderDetailsPage";
import { AdminSalesRepActivityPage } from "@/pages/AdminSalesRepActivityPage";
import { AuthCallbackPage } from "@/pages/AuthCallbackPage";
import { CartPage } from "@/pages/CartPage";
import { RequireAdmin } from "@/components/RequireAdmin";
import { CheckoutPage } from "@/pages/CheckoutPage";
import { FoodDetailsPage } from "@/pages/FoodDetailsPage";
import { FirstLoginPasswordPage } from "@/pages/FirstLoginPasswordPage";
import { HomePage } from "@/pages/HomePage";
import { LoginPage } from "@/pages/LoginPage";
import { MenuPage } from "@/pages/MenuPage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { PrivacyPage } from "@/pages/PrivacyPage";
import { RequireSalesRep } from "@/components/RequireSalesRep";
import { RequireCustomer } from "@/components/RequireCustomer";
import { RequireKitchen } from "@/components/RequireKitchen";
import { SalesRepPosPage } from "@/pages/SalesRepPosPage";
import { KitchenDashboardPage } from "@/pages/KitchenDashboardPage";
import { SignupPage } from "@/pages/SignupPage";
import { TermsPage } from "@/pages/TermsPage";
import { TrackingPage } from "@/pages/TrackingPage";

export function App() {
  const [darkMode, setDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem("savoury-theme");
    return savedTheme ? savedTheme === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("savoury-theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  useEffect(() => {
    const syncTheme = (event: Event) => {
      const selectedTheme = (event as CustomEvent<"light" | "dark">).detail;
      setDarkMode(selectedTheme === "dark");
    };
    window.addEventListener("savoury-theme-change", syncTheme);
    return () => window.removeEventListener("savoury-theme-change", syncTheme);
  }, []);

  return (
    <Routes>
      <Route element={<Layout darkMode={darkMode} setDarkMode={setDarkMode} />}>
        <Route index element={<HomePage />} />
        <Route path="menu" element={<MenuPage />} />
        <Route path="food/:slug" element={<FoodDetailsPage />} />
        <Route path="cart" element={<RequireCustomer allowGuest><CartPage /></RequireCustomer>} />
        <Route path="checkout" element={<RequireCustomer><CheckoutPage /></RequireCustomer>} />
        <Route path="track/:orderId" element={<RequireCustomer><TrackingPage /></RequireCustomer>} />
        <Route path="account" element={<RequireCustomer><AccountPage /></RequireCustomer>} />
        <Route path="auth/callback" element={<AuthCallbackPage />} />
        <Route path="change-password" element={<FirstLoginPasswordPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="signup" element={<SignupPage />} />
        <Route path="pos" element={<RequireSalesRep><SalesRepPosPage /></RequireSalesRep>} />
        <Route path="kitchen" element={<RequireKitchen><KitchenDashboardPage /></RequireKitchen>} />
        <Route path="admin" element={<RequireAdmin><AdminDashboard /></RequireAdmin>} />
        <Route path="admin/activity" element={<RequireAdmin><AdminActivityPage /></RequireAdmin>} />
        <Route path="admin/orders/:orderId" element={<RequireAdmin><AdminOrderDetailsPage /></RequireAdmin>} />
        <Route path="admin/sales-representatives/:repId" element={<RequireAdmin><AdminSalesRepActivityPage /></RequireAdmin>} />
        <Route path="admin/menu" element={<RequireAdmin><AdminManageMenuPage /></RequireAdmin>} />
        <Route path="admin/foods/new" element={<RequireAdmin><AdminFoodFormPage /></RequireAdmin>} />
        <Route path="admin/foods/:foodId/edit" element={<RequireAdmin><AdminFoodFormPage /></RequireAdmin>} />
        <Route path="privacy" element={<PrivacyPage />} />
        <Route path="terms" element={<TermsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
