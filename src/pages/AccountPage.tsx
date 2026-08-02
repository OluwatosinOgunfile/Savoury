import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Bell, Heart, History, KeyRound, LayoutDashboard, MapPin, Settings, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/hooks/useAuth";
import { accountKeys, fetchUserAddresses, fetchUserFavorites, fetchUserNotifications, fetchUserOrderSummaries } from "@/services/accountDataService";

const tabs = ["Profile", "Addresses", "Favorites", "Orders", "Notifications", "Settings"] as const;

export function AccountPage() {
  const [active, setActive] = useState<(typeof tabs)[number]>("Profile");
  const { profile, user, isAuthenticated, signOut } = useAuth();
  const userId = user?.id;
  const { data: savedAddresses = [] } = useQuery({ queryKey: accountKeys.addresses(userId), queryFn: () => fetchUserAddresses(userId) });
  const { data: favoriteFoods = [] } = useQuery({ queryKey: accountKeys.favorites(userId), queryFn: () => fetchUserFavorites(userId) });
  const { data: orderSummaries = [] } = useQuery({ queryKey: accountKeys.orders(userId), queryFn: () => fetchUserOrderSummaries(userId) });
  const { data: userNotifications = [] } = useQuery({ queryKey: accountKeys.notifications(userId), queryFn: () => fetchUserNotifications(userId) });

  return (
    <main className="app-container grid gap-6 py-6 lg:grid-cols-[280px_1fr]">
      <aside className="h-fit lg:sticky lg:top-24">
        <Card>
          <CardContent className="grid gap-2">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActive(tab)}
                className={`rounded-xl px-4 py-3 text-left font-black transition ${active === tab ? "bg-savoury-accent text-savoury-primary" : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-white/10"}`}
              >
                {tab}
              </button>
            ))}
          </CardContent>
        </Card>
      </aside>
      <section>
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h1 className="section-title">User Account</h1>
            <p className="mt-2 text-zinc-500">
              {isAuthenticated ? "Your Supabase account is connected." : "Login and signup support email/password and Google sign-in through Supabase OAuth."}
            </p>
          </div>
          {isAuthenticated ? (
            <div className="flex flex-wrap gap-2">
              {profile?.role === "admin" && <Link to="/admin"><Button><LayoutDashboard className="h-4 w-4" /> Admin Dashboard</Button></Link>}
              <Button variant="outline" onClick={signOut}>Sign out</Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Link to="/login"><Button variant="outline">Login</Button></Link>
              <Link to="/signup"><Button>Sign up</Button></Link>
            </div>
          )}
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
    </main>
  );
}

function ProfileCard({ profile }: { profile: ReturnType<typeof useAuth>["profile"] }) {
  const initials = (profile?.fullName || "Savoury Customer").slice(0, 2).toUpperCase();

  return (
    <Card>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <div className="flex items-center gap-4 md:col-span-2">
          {profile?.avatarUrl ? (
            <img src={profile.avatarUrl} alt={profile.fullName} className="h-16 w-16 rounded-xl object-cover" />
          ) : (
            <div className="grid h-16 w-16 place-items-center rounded-xl bg-savoury-primary text-2xl font-black text-white">{initials}</div>
          )}
          <div>
            <h2 className="text-xl font-black">{profile?.fullName || "Savoury Customer"}</h2>
            <p className="text-sm text-zinc-500">{profile ? `${profile.role} role | ${profile.loyaltyPoints} loyalty points` : "Sign in to sync your Supabase profile."}</p>
          </div>
        </div>
        <Input value={profile?.fullName || ""} placeholder="Full name" readOnly />
        <Input value={profile?.email || ""} placeholder="Email" readOnly />
        <Input value={profile?.phone || ""} placeholder="Phone" readOnly />
        <Button><KeyRound className="h-4 w-4" /> Update Profile</Button>
      </CardContent>
    </Card>
  );
}

function ListCard({ title, icon: Icon, items }: { title: string; icon: LucideIcon; items: string[] }) {
  return (
    <Card>
      <CardContent>
        <div className="flex items-center gap-3">
          <Icon className="h-6 w-6 text-savoury-primary" />
          <h2 className="text-xl font-black">{title}</h2>
        </div>
        <div className="mt-5 grid gap-3">
          {items.map((item) => (
            <div key={item} className="rounded-xl border border-zinc-100 p-4 font-bold text-zinc-600 dark:border-white/10 dark:text-zinc-300">
              {item}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
