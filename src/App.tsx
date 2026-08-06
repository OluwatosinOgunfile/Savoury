import { lazy, Suspense, useEffect, useState } from "react";
import { Route, Routes } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { RequireAdmin } from "@/components/RequireAdmin";
import { RequireSalesRep } from "@/components/RequireSalesRep";
import { RequireCustomer } from "@/components/RequireCustomer";
import { RequireKitchen } from "@/components/RequireKitchen";
import { PageLoader } from "@/components/PageLoader";

const AccountPage = lazy(() => import("@/pages/AccountPage").then((module) => ({ default: module.AccountPage })));
const AdminDashboard = lazy(() => import("@/pages/AdminDashboard").then((module) => ({ default: module.AdminDashboard })));
const AdminActivityPage = lazy(() => import("@/pages/AdminActivityPage").then((module) => ({ default: module.AdminActivityPage })));
const AdminFoodFormPage = lazy(() => import("@/pages/AdminFoodFormPage").then((module) => ({ default: module.AdminFoodFormPage })));
const AdminManageMenuPage = lazy(() => import("@/pages/AdminManageMenuPage").then((module) => ({ default: module.AdminManageMenuPage })));
const AdminOrderDetailsPage = lazy(() => import("@/pages/AdminOrderDetailsPage").then((module) => ({ default: module.AdminOrderDetailsPage })));
const AdminOrdersPage = lazy(() => import("@/pages/AdminOrdersPage").then((module) => ({ default: module.AdminOrdersPage })));
const AdminSalesRepActivityPage = lazy(() => import("@/pages/AdminSalesRepActivityPage").then((module) => ({ default: module.AdminSalesRepActivityPage })));
const AdminStaffActivityTimelinePage = lazy(() => import("@/pages/AdminStaffActivityTimelinePage").then((module) => ({ default: module.AdminStaffActivityTimelinePage })));
const AdminStaffPosSalesPage = lazy(() => import("@/pages/AdminStaffPosSalesPage").then((module) => ({ default: module.AdminStaffPosSalesPage })));
const AdminKitchenStaffActivityPage = lazy(() => import("@/pages/AdminKitchenStaffActivityPage").then((module) => ({ default: module.AdminKitchenStaffActivityPage })));
const AuthCallbackPage = lazy(() => import("@/pages/AuthCallbackPage").then((module) => ({ default: module.AuthCallbackPage })));
const CartPage = lazy(() => import("@/pages/CartPage").then((module) => ({ default: module.CartPage })));
const CheckoutPage = lazy(() => import("@/pages/CheckoutPage").then((module) => ({ default: module.CheckoutPage })));
const FoodDetailsPage = lazy(() => import("@/pages/FoodDetailsPage").then((module) => ({ default: module.FoodDetailsPage })));
const FirstLoginPasswordPage = lazy(() => import("@/pages/FirstLoginPasswordPage").then((module) => ({ default: module.FirstLoginPasswordPage })));
const HomePage = lazy(() => import("@/pages/HomePage").then((module) => ({ default: module.HomePage })));
const LoginPage = lazy(() => import("@/pages/LoginPage").then((module) => ({ default: module.LoginPage })));
const MenuPage = lazy(() => import("@/pages/MenuPage").then((module) => ({ default: module.MenuPage })));
const NotFoundPage = lazy(() => import("@/pages/NotFoundPage").then((module) => ({ default: module.NotFoundPage })));
const PrivacyPage = lazy(() => import("@/pages/PrivacyPage").then((module) => ({ default: module.PrivacyPage })));
const SalesRepPosPage = lazy(() => import("@/pages/SalesRepPosPage").then((module) => ({ default: module.SalesRepPosPage })));
const KitchenDashboardPage = lazy(() => import("@/pages/KitchenDashboardPage").then((module) => ({ default: module.KitchenDashboardPage })));
const SignupPage = lazy(() => import("@/pages/SignupPage").then((module) => ({ default: module.SignupPage })));
const TermsPage = lazy(() => import("@/pages/TermsPage").then((module) => ({ default: module.TermsPage })));
const TrackingPage = lazy(() => import("@/pages/TrackingPage").then((module) => ({ default: module.TrackingPage })));

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
    <Suspense fallback={<PageLoader />}><Routes>
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
        <Route path="admin/orders" element={<RequireAdmin><AdminOrdersPage /></RequireAdmin>} />
        <Route path="admin/orders/:orderId" element={<RequireAdmin><AdminOrderDetailsPage /></RequireAdmin>} />
        <Route path="admin/sales-representatives/:repId" element={<RequireAdmin><AdminSalesRepActivityPage /></RequireAdmin>} />
        <Route path="admin/sales-representatives/:repId/activity" element={<RequireAdmin><AdminStaffActivityTimelinePage /></RequireAdmin>} />
        <Route path="admin/sales-representatives/:repId/sales" element={<RequireAdmin><AdminStaffPosSalesPage /></RequireAdmin>} />
        <Route path="admin/kitchen-staff/:staffId" element={<RequireAdmin><AdminKitchenStaffActivityPage /></RequireAdmin>} />
        <Route path="admin/menu" element={<RequireAdmin><AdminManageMenuPage /></RequireAdmin>} />
        <Route path="admin/foods/new" element={<RequireAdmin><AdminFoodFormPage /></RequireAdmin>} />
        <Route path="admin/foods/:foodId/edit" element={<RequireAdmin><AdminFoodFormPage /></RequireAdmin>} />
        <Route path="privacy" element={<PrivacyPage />} />
        <Route path="terms" element={<TermsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes></Suspense>
  );
}
