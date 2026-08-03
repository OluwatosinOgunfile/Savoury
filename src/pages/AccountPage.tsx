import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  Check,
  Heart,
  History,
  ImagePlus,
  KeyRound,
  LayoutDashboard,
  LogOut,
  MapPin,
  Moon,
  Settings,
  Trash2,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/hooks/useAuth";
import { formatCurrency } from "@/lib/utils";
import {
  accountKeys,
  deleteNotification,
  deleteUserAddress,
  fetchUserAddresses,
  fetchUserFavorites,
  fetchUserNotifications,
  fetchUserOrders,
  markAllNotificationsRead,
  markNotificationRead,
  removeUserFavorite,
  saveUserAddress,
  setDefaultUserAddress,
  updateUserProfile,
} from "@/services/accountDataService";
import type { Address, Food, NotificationItem } from "@/types";
import type { StoredOrder } from "@/services/orderStorage";

const tabs = [
  { label: "Profile", icon: UserRound },
  { label: "Addresses", icon: MapPin },
  { label: "Favorites", icon: Heart },
  { label: "Orders", icon: History },
  { label: "Notifications", icon: Bell },
  { label: "Settings", icon: Settings },
] as const;

type AccountTab = (typeof tabs)[number]["label"];

export function AccountPage() {
  const [active, setActive] = useState<AccountTab>("Profile");
  const [message, setMessage] = useState("");
  const { profile, user, isAuthenticated, signOut, refreshProfile } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id || profile?.id;
  const { data: savedAddresses = [] } = useQuery({ queryKey: accountKeys.addresses(userId), queryFn: () => fetchUserAddresses(userId) });
  const { data: favoriteFoods = [] } = useQuery({ queryKey: accountKeys.favorites(userId), queryFn: () => fetchUserFavorites(userId) });
  const { data: userOrders = [] } = useQuery({ queryKey: accountKeys.orders(userId), queryFn: () => fetchUserOrders(userId) });
  const { data: userNotifications = [] } = useQuery({ queryKey: accountKeys.notifications(userId), queryFn: () => fetchUserNotifications(userId) });

  const announce = (text: string) => {
    setMessage(text);
    window.setTimeout(() => setMessage(""), 3000);
  };

  const refreshAddresses = () => queryClient.invalidateQueries({ queryKey: accountKeys.addresses(userId) });
  const refreshFavorites = () => queryClient.invalidateQueries({ queryKey: accountKeys.favorites(userId) });
  const refreshNotifications = () => queryClient.invalidateQueries({ queryKey: accountKeys.notifications(userId) });

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
              <Stat label="Orders" value={userOrders.length} />
            </div>
            {message && <p className="mt-4 rounded-xl border border-savoury-primary/20 bg-savoury-accent px-4 py-3 text-sm font-black text-savoury-primary">{message}</p>}
            <div className="mt-5">
              {active === "Profile" && (
                <ProfilePanel
                  profile={profile}
                  onSave={async (form) => {
                    await updateUserProfile(userId, form);
                    await refreshProfile();
                    announce("Profile updated.");
                  }}
                />
              )}
              {active === "Addresses" && (
                <AddressesPanel
                  addresses={savedAddresses}
                  onSave={async (address) => {
                    await saveUserAddress(userId, address);
                    await refreshAddresses();
                    announce("Address saved.");
                  }}
                  onDefault={async (addressId) => {
                    await setDefaultUserAddress(userId, addressId);
                    await refreshAddresses();
                    announce("Default address updated.");
                  }}
                  onDelete={async (addressId) => {
                    await deleteUserAddress(userId, addressId);
                    await refreshAddresses();
                    announce("Address deleted.");
                  }}
                />
              )}
              {active === "Favorites" && (
                <FavoritesPanel
                  foods={favoriteFoods}
                  onRemove={async (foodId) => {
                    await removeUserFavorite(userId, foodId);
                    await refreshFavorites();
                    announce("Favorite removed.");
                  }}
                />
              )}
              {active === "Orders" && <OrdersPanel orders={userOrders} />}
              {active === "Notifications" && (
                <NotificationsPanel
                  notifications={userNotifications}
                  onRead={async (notificationId) => {
                    await markNotificationRead(userId, notificationId);
                    await refreshNotifications();
                    announce("Notification marked as read.");
                  }}
                  onReadAll={async () => {
                    await markAllNotificationsRead(userId);
                    await refreshNotifications();
                    announce("All notifications marked as read.");
                  }}
                  onDelete={async (notificationId) => {
                    await deleteNotification(userId, notificationId);
                    await refreshNotifications();
                    announce("Notification deleted.");
                  }}
                />
              )}
              {active === "Settings" && <SettingsPanel profile={profile} announce={announce} />}
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

function ProfilePanel({ profile, onSave }: { profile: ReturnType<typeof useAuth>["profile"]; onSave: (form: { fullName: string; phone?: string; avatarUrl?: string }) => Promise<void> }) {
  const [form, setForm] = useState({ fullName: "", phone: "", avatarUrl: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({ fullName: profile?.fullName || "", phone: profile?.phone || "", avatarUrl: profile?.avatarUrl || "" });
  }, [profile]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  };

  const uploadPhoto = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setForm((current) => ({ ...current, avatarUrl: String(reader.result || "") }));
    };
    reader.readAsDataURL(file);
  };

  return (
    <Panel icon={UserRound} title="Profile Details" action={<Button form="profile-form" size="sm" disabled={saving}>{saving ? "Saving..." : "Save changes"}</Button>}>
      <form id="profile-form" onSubmit={submit} className="grid gap-4 md:grid-cols-2">
        <Input required placeholder="Full name" value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} />
        <Input placeholder="Phone number" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
        <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4 dark:border-white/10 dark:bg-white/5 md:col-span-2">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              {form.avatarUrl ? (
                <img src={form.avatarUrl} alt="Profile preview" className="h-16 w-16 rounded-xl object-cover" />
              ) : (
                <div className="grid h-16 w-16 place-items-center rounded-xl bg-savoury-primary text-lg font-black text-white">
                  {(form.fullName || "SC").slice(0, 2).toUpperCase()}
                </div>
              )}
              <div>
                <p className="font-black text-zinc-950 dark:text-white">Profile photo</p>
                <p className="text-sm text-zinc-500">Upload an image from your device.</p>
              </div>
            </div>
            <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl bg-savoury-primary px-4 text-sm font-bold text-white transition hover:bg-[#445626]">
              <ImagePlus className="h-4 w-4" />
              Upload photo
              <input className="sr-only" type="file" accept="image/*" onChange={(event) => uploadPhoto(event.target.files?.[0])} />
            </label>
          </div>
        </div>
        <Info label="Email" value={profile?.email || "Not provided"} />
        <Info label="Loyalty points" value={`${profile?.loyaltyPoints || 0} points`} />
      </form>
    </Panel>
  );
}

function AddressesPanel({ addresses, onSave, onDefault, onDelete }: { addresses: Address[]; onSave: (address: Omit<Address, "id"> & { id?: string }) => Promise<void>; onDefault: (addressId: string) => Promise<void>; onDelete: (addressId: string) => Promise<void> }) {
  const emptyForm = { label: "", line1: "", city: "Lagos", distanceKm: 3, default: false };
  const [form, setForm] = useState<Omit<Address, "id"> & { id?: string }>(emptyForm);
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await onSave(form);
      setForm(emptyForm);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Panel icon={MapPin} title="Saved Addresses">
      <form onSubmit={submit} className="grid gap-3 rounded-2xl border border-zinc-100 bg-zinc-50 p-4 dark:border-white/10 dark:bg-white/5 md:grid-cols-2">
        <Input required placeholder="Label, e.g. Home" value={form.label} onChange={(event) => setForm({ ...form, label: event.target.value })} />
        <Input required placeholder="City" value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} />
        <Input required className="md:col-span-2" placeholder="Full address" value={form.line1} onChange={(event) => setForm({ ...form, line1: event.target.value })} />
        <label className="flex items-center gap-2 text-sm font-bold text-zinc-600 dark:text-zinc-300">
          <input type="checkbox" checked={Boolean(form.default)} onChange={(event) => setForm({ ...form, default: event.target.checked })} />
          Make default address
        </label>
        <Button className="md:justify-self-end" disabled={saving}>{saving ? "Saving..." : form.id ? "Update address" : "Add address"}</Button>
      </form>
      <div className="mt-4 grid gap-3">
        {addresses.map((address) => (
          <div key={address.id} className="flex flex-col gap-3 rounded-2xl border border-zinc-100 p-4 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-black text-zinc-950 dark:text-white">{address.label} {address.default && <span className="text-xs text-savoury-primary">Default</span>}</p>
              <p className="text-sm text-zinc-500">{address.line1}, {address.city}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => setForm(address)}>Edit</Button>
              <Button size="sm" variant="outline" onClick={() => onDefault(address.id)}>Default</Button>
              <Button size="sm" variant="outline" onClick={() => onDelete(address.id)}><Trash2 className="h-4 w-4" /> Delete</Button>
            </div>
          </div>
        ))}
        {addresses.length === 0 && <EmptyState text="No saved addresses yet." />}
      </div>
    </Panel>
  );
}

function FavoritesPanel({ foods, onRemove }: { foods: Food[]; onRemove: (foodId: string) => Promise<void> }) {
  return (
    <Panel icon={Heart} title="Favorite Meals">
      <div className="grid gap-3 md:grid-cols-2">
        {foods.map((food) => (
          <div key={food.id} className="flex gap-3 rounded-2xl border border-zinc-100 p-3 dark:border-white/10">
            <img src={food.image} alt={food.name} className="h-20 w-20 rounded-xl object-cover" />
            <div className="min-w-0 flex-1">
              <Link to={`/food/${food.slug}`} className="line-clamp-1 font-black text-zinc-950 hover:text-savoury-primary dark:text-white">{food.name}</Link>
              <p className="text-sm font-bold text-savoury-primary">{formatCurrency(food.price)}</p>
              <div className="mt-2 flex gap-2">
                <Link to={`/food/${food.slug}`}><Button size="sm">Order</Button></Link>
                <Button size="sm" variant="outline" onClick={() => onRemove(food.id)}>Remove</Button>
              </div>
            </div>
          </div>
        ))}
        {foods.length === 0 && <EmptyState text="No favorite meals yet." />}
      </div>
    </Panel>
  );
}

function OrdersPanel({ orders }: { orders: StoredOrder[] }) {
  return (
    <Panel icon={History} title="Order History">
      <div className="grid gap-3">
        {orders.map((order) => (
          <div key={order.id} className="flex flex-col gap-3 rounded-2xl border border-zinc-100 p-4 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-black text-zinc-950 dark:text-white">Order {order.id}</p>
              <p className="text-sm text-zinc-500">{order.status.replace(/_/g, " ")} | {order.items.length} item{order.items.length === 1 ? "" : "s"} | {formatCurrency(order.total)}</p>
            </div>
            <Link to={`/track/${order.id}`}><Button size="sm">Track order</Button></Link>
          </div>
        ))}
        {orders.length === 0 && <EmptyState text="No orders yet." />}
      </div>
    </Panel>
  );
}

function NotificationsPanel({ notifications, onRead, onReadAll, onDelete }: { notifications: NotificationItem[]; onRead: (notificationId: string) => Promise<void>; onReadAll: () => Promise<void>; onDelete: (notificationId: string) => Promise<void> }) {
  return (
    <Panel icon={Bell} title="Notifications" action={<Button size="sm" variant="outline" onClick={onReadAll}>Mark all read</Button>}>
      <div className="grid gap-3">
        {notifications.map((notification) => (
          <div key={notification.id} className={`rounded-2xl border p-4 ${notification.read ? "border-zinc-100 bg-zinc-50 dark:border-white/10 dark:bg-white/5" : "border-savoury-primary/30 bg-savoury-accent dark:bg-savoury-primary/10"}`}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="font-black text-zinc-950 dark:text-white">{notification.title}</p>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">{notification.body}</p>
              </div>
              <div className="flex gap-2">
                {!notification.read && <Button size="sm" variant="outline" onClick={() => onRead(notification.id)}><Check className="h-4 w-4" /> Read</Button>}
                <Button size="sm" variant="outline" onClick={() => onDelete(notification.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
          </div>
        ))}
        {notifications.length === 0 && <EmptyState text="No notifications yet." />}
      </div>
    </Panel>
  );
}

function SettingsPanel({ profile, announce }: { profile: ReturnType<typeof useAuth>["profile"]; announce: (text: string) => void }) {
  const [pushReady, setPushReady] = useState(localStorage.getItem("savoury-push-ready") === "true");

  const setTheme = (theme: "dark" | "light") => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("savoury-theme", theme);
    announce(`${theme === "dark" ? "Dark" : "Light"} mode selected.`);
  };

  const togglePush = () => {
    const next = !pushReady;
    setPushReady(next);
    localStorage.setItem("savoury-push-ready", String(next));
    announce(next ? "Push notifications enabled for this device." : "Push notifications disabled.");
  };

  const copyReferral = async () => {
    await navigator.clipboard?.writeText(profile?.id ? `SAVOURY-${profile.id.slice(0, 6).toUpperCase()}` : "SAVOURY-FRIEND");
    announce("Referral code copied.");
  };

  return (
    <Panel icon={Settings} title="Settings">
      <div className="grid gap-3 md:grid-cols-2">
        <SettingCard icon={Moon} title="Appearance" description="Switch the interface theme for this device.">
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setTheme("light")}>Light</Button>
            <Button size="sm" onClick={() => setTheme("dark")}>Dark</Button>
          </div>
        </SettingCard>
        <SettingCard icon={Bell} title="Push notification ready" description={pushReady ? "Notifications are enabled locally." : "Enable notification preference for this device."}>
          <Button size="sm" variant={pushReady ? "outline" : "primary"} onClick={togglePush}>{pushReady ? "Disable" : "Enable"}</Button>
        </SettingCard>
        <SettingCard icon={Heart} title="Referral code" description="Share your code with friends for future rewards.">
          <Button size="sm" variant="outline" onClick={copyReferral}>Copy code</Button>
        </SettingCard>
        <SettingCard icon={KeyRound} title="Rewards" description={`${profile?.loyaltyPoints || 0} loyalty points available on your account.`}>
          <Link to="/menu"><Button size="sm">Earn points</Button></Link>
        </SettingCard>
      </div>
    </Panel>
  );
}

function Panel({ icon: Icon, title, action, children }: { icon: LucideIcon; title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <Card className="border-zinc-100 shadow-none dark:border-white/10">
      <CardContent className="p-5">
        <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <Icon className="h-5 w-5 text-savoury-primary" />
            <h2 className="text-lg font-black text-zinc-950 dark:text-white">{title}</h2>
          </div>
          {action}
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

function SettingCard({ icon: Icon, title, description, children }: { icon: LucideIcon; title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4 dark:border-white/10 dark:bg-white/5">
      <Icon className="h-5 w-5 text-savoury-primary" />
      <p className="mt-3 font-black text-zinc-950 dark:text-white">{title}</p>
      <p className="mt-1 min-h-10 text-sm text-zinc-500">{description}</p>
      <div className="mt-4">{children}</div>
    </div>
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

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-xl border border-dashed border-zinc-200 p-4 text-sm text-zinc-500 dark:border-white/10">{text}</div>;
}
