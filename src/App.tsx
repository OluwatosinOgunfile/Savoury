import { useEffect, useState } from "react";
import { Route, Routes } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { AccountPage } from "@/pages/AccountPage";
import { AdminDashboard } from "@/pages/AdminDashboard";
import { AdminFoodFormPage } from "@/pages/AdminFoodFormPage";
import { AdminManageMenuPage } from "@/pages/AdminManageMenuPage";
import { AdminOrderDetailsPage } from "@/pages/AdminOrderDetailsPage";
import { AuthCallbackPage } from "@/pages/AuthCallbackPage";
import { CartPage } from "@/pages/CartPage";
import { CashierDashboardPage } from "@/pages/CashierDashboardPage";
import { RequireAdmin } from "@/components/RequireAdmin";
import { RequireRestaurantStaff } from "@/components/RequireRestaurantStaff";
import { CheckoutPage } from "@/pages/CheckoutPage";
import { FoodDetailsPage } from "@/pages/FoodDetailsPage";
import { HomePage } from "@/pages/HomePage";
import { LoginPage } from "@/pages/LoginPage";
import { MenuPage } from "@/pages/MenuPage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { PrivacyPage } from "@/pages/PrivacyPage";
import { SignupPage } from "@/pages/SignupPage";
import { TermsPage } from "@/pages/TermsPage";
import { TrackingPage } from "@/pages/TrackingPage";
import { RestaurantLoginPage } from "@/pages/RestaurantLoginPage";

export function App() {
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("savoury-theme") !== "light");

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("savoury-theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  return (
    <Routes>
      <Route element={<Layout darkMode={darkMode} setDarkMode={setDarkMode} />}>
        <Route index element={<HomePage />} />
        <Route path="menu" element={<MenuPage />} />
        <Route path="food/:slug" element={<FoodDetailsPage />} />
        <Route path="cart" element={<CartPage />} />
        <Route path="checkout" element={<CheckoutPage />} />
        <Route path="track/:orderId" element={<TrackingPage />} />
        <Route path="account" element={<AccountPage />} />
        <Route path="auth/callback" element={<AuthCallbackPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="signup" element={<SignupPage />} />
        <Route path="admin" element={<RequireAdmin><AdminDashboard /></RequireAdmin>} />
        <Route path="admin/cashier" element={<RequireRestaurantStaff><CashierDashboardPage /></RequireRestaurantStaff>} />
        <Route path="restaurant" element={<RequireRestaurantStaff><CashierDashboardPage /></RequireRestaurantStaff>} />
        <Route path="restaurant/login" element={<RestaurantLoginPage />} />
        <Route path="admin/orders/:orderId" element={<RequireAdmin><AdminOrderDetailsPage /></RequireAdmin>} />
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
