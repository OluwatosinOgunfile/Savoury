import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Bell, Heart, History, KeyRound, LayoutDashboard, LogOut, MapPin, Settings, UserRound, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { useAuth } from "@/hooks/useAuth";
import { accountKeys, fetchUserAddresses, fetchUserFavorites, fetchUserNotifications, fetchUserOrderSummaries } from "@/services/accountDataService";

const tabs = [
  { label: "Profile", icon: UserRound },
  { label: "Addresses", icon: MapPin },
  { label: "Favorites", icon: Heart },
  { label: "Orders", icon: History },
  { label: "Notifications", icon: Bell },
  { label: "Settings", icon: Settings },
] as const;

export function AccountPage() {
  const [active, setActive] = useState<(typeof tabs)[number]["label"]>("Profile");
  const { profile, user, isAuthenticated, signOut } = useAuth();
  const userId = user?.id;
  const { data: savedAddresses = [] } = useQuery({ queryKey: accountKeys.addresses(userId), queryFn: () => fetchUserAddresses(userId) });
  const { data: favoriteFoods = [] } = useQuery({ queryKey: accountKeys.favorites(userId), queryFn: () => fetchUserFavorites(userId) });
  const { data: orderSummaries = [] } = useQuery({ queryKey: accountKeys.orders(userId), queryFn: () => fetchUserOrderSummaries(userId) });
  const { data: userNotifications = [] } = useQuery({ queryKey: accountKeys.notifications(userId), queryFn: () => fetchUserNotifications(userId) });

  return (
    <main className="app-container py-6">
      <section className="overflow-hidden rounded-3xl border border-zinc-100 bg-white shadow-soft dark:border-white/10 dark:bg-[#181818]">
        <div className="grid gap-0 lg:grid-cols-[260px_1fr]">
          <aside className="border-b border-zinc-100 bg-zinc-50/70 p-4 dark:border-white/10 dark:bg-black/20 lg:border-b-0 lg:border-r">
            <ProfileMini profile={profile} />
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-1">
              {tabs.map(({ label, icon: Icon }) => (
                <button
                  key={label}
                  onClick={() => setActive(label)}
                  className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-black transition ${
                    active === label ? "bg-savoury-primary text-white shadow-soft" : "text-zinc-600 hover:bg-white dark:text-zinc-300 dark:hover:bg-white/10"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>
          </aside>
          <section className="p-5 md:p-6">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-savoury-primary">My Savoury</p>
                <h1 className="mt-1 font-display text-2xl font-black text-zinc-950 dark:text-white md:text-3xl">Account</h1>
                <p className="mt-2 max-w-2xl text-sm text-zinc-500">
                  {isAuthenticated ? "Manage your profile, meals, orders, and restaurant updates." : "Sign in to sync your profile, saved addresses, and Google account."}
                </p>
              </div>
              {isAuthenticated ? (
                <div className="flex flex-wrap gap-2">
                  {profile?.role === "admin" && <Link to="/admin"><Button size="sm"><LayoutDashboard className="h-4 w-4" /> Admin</Button></Link>}
                  <Button size="sm" variant="outline" onClick={signOut}><LogOut className="h-4 w-4" /> Sign out</Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Link to="/login"><Button size="sm" variant="outline">Login</Button></Link>
                  <Link to="/signup"><Button size="sm">Sign up</Button></Link>
                </div>
              )}
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <Stat label="Saved addresses" value={savedAddresses.length} />
              <Stat label="Favorite meals" value={favoriteFoods.length} />
              <Stat label="Orders" value={orderSummaries.length} />
            </div>
            <div className="mt-5">
          {active === "Profile" && <ProfileCard profile={profile} />}
          {active === "Addresses" && <ListCard icon={MapPin} title="Saved Addresses" items={savedAddresses.map((address) => `${address.label}: ${address.line1}, ${address.city}`)} />}
          {active === "Favorites" && <ListCard icon={Heart} title="Favorite Meals" items={favoriteFoods.map((food) => food.name)} />}
          {active === "Orders" && <ListCard icon={History} title="Order History and Track Orders" items={orderSummaries} />}
          {active === "Notifications" && <ListCard icon={Bell} title="Notifications" items={userNotifications.map((item) => `${item.title}: ${item.body}`)} />}
          {active === "Settings" && <ListCard icon={Settings} title="Settings" items={["Light and dark mode", "Push notification ready", "Referral code SAVOURY-FRIEND", "Loyalty rewards: 1 point per NGN 100"]} />}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}

function ProfileMini({ profile }: { profile: ReturnType<typeof useAuth>["profile"] }) {
  const initials = (profile?.fullName || "Savoury Customer").slice(0, 2).toUpperCase();
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm dark:bg-white/5">
      {profile?.avatarUrl ? (
        <img src={profile.avatarUrl} alt={profile.fullName} className="h-11 w-11 rounded-xl object-cover" />
      ) : (
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-savoury-primary text-sm font-black text-white">{initials}</div>
      )}
      <div className="min-w-0">
        <p className="truncate text-sm font-black text-zinc-950 dark:text-white">{profile?.fullName || "Savoury Customer"}</p>
        <p className="truncate text-xs text-zinc-500">{profile?.email || "Not signed in"}</p>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4 dark:border-white/10 dark:bg-white/5">
      <p className="text-2xl font-black text-zinc-950 dark:text-white">{value}</p>
      <p className="text-xs font-bold text-zinc-500">{label}</p>
    </div>
  );
}

function ProfileCard({ profile }: { profile: ReturnType<typeof useAuth>["profile"] }) {
  const initials = (profile?.fullName || "Savoury Customer").slice(0, 2).toUpperCase();

  return (
    <Card className="border-zinc-100 shadow-none dark:border-white/10">
      <CardContent className="grid gap-4 p-5 md:grid-cols-[1fr_1fr]">
        <div className="flex items-center gap-4 md:col-span-2">
          {profile?.avatarUrl ? (
            <img src={profile.avatarUrl} alt={profile.fullName} className="h-14 w-14 rounded-xl object-cover" />
          ) : (
            <div className="grid h-14 w-14 place-items-center rounded-xl bg-savoury-primary text-lg font-black text-white">{initials}</div>
          )}
          <div>
            <h2 className="text-lg font-black text-zinc-950 dark:text-white">{profile?.fullName || "Savoury Customer"}</h2>
            <p className="text-sm text-zinc-500">{profile ? `${profile.role} role | ${profile.loyaltyPoints} loyalty points` : "Sign in to sync your Supabase profile."}</p>
          </div>
        </div>
        <Info label="Full name" value={profile?.fullName || "Not provided"} />
        <Info label="Email" value={profile?.email || "Not provided"} />
        <Info label="Phone" value={profile?.phone || "Not provided"} />
        <Button className="md:self-end"><KeyRound className="h-4 w-4" /> Update Profile</Button>
      </CardContent>
    </Card>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-3 dark:border-white/10 dark:bg-white/5">
      <p className="text-xs font-bold text-zinc-500">{label}</p>
      <p className="mt-1 truncate text-sm font-black text-zinc-900 dark:text-white">{value}</p>
    </div>
  );
}

function ListCard({ title, icon: Icon, items }: { title: string; icon: LucideIcon; items: string[] }) {
  return (
    <Card className="border-zinc-100 shadow-none dark:border-white/10">
      <CardContent className="p-5">
        <div className="flex items-center gap-3">
          <Icon className="h-5 w-5 text-savoury-primary" />
          <h2 className="text-lg font-black text-zinc-950 dark:text-white">{title}</h2>
        </div>
        <div className="mt-4 grid gap-2">
          {items.length > 0 ? items.map((item) => (
            <div key={item} className="rounded-xl border border-zinc-100 bg-zinc-50 p-3 text-sm font-bold text-zinc-600 dark:border-white/10 dark:bg-white/5 dark:text-zinc-300">
              {item}
            </div>
          )) : <div className="rounded-xl border border-dashed border-zinc-200 p-4 text-sm text-zinc-500 dark:border-white/10">Nothing here yet.</div>}
        </div>
      </CardContent>
    </Card>
  );
}
