import { addresses, foods, notifications } from "@/data/catalog";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { fetchAdminOrders, type StoredOrder } from "@/services/orderStorage";
import type { Address, Food, NotificationItem } from "@/types";

export const accountKeys = {
  addresses: (userId?: string) => ["account-addresses", userId || "guest"] as const,
  favorites: (userId?: string) => ["account-favorites", userId || "guest"] as const,
  orders: (userId?: string) => ["account-orders", userId || "guest"] as const,
  notifications: (userId?: string) => ["account-notifications", userId || "guest"] as const,
};

const localAddressesKey = "savoury-demo-addresses";

function getLocalAddresses() {
  try {
    return JSON.parse(localStorage.getItem(localAddressesKey) || "null") as Address[] | null;
  } catch {
    return null;
  }
}

function saveLocalAddresses(nextAddresses: Address[]) {
  localStorage.setItem(localAddressesKey, JSON.stringify(nextAddresses));
}

export async function fetchUserAddresses(userId?: string): Promise<Address[]> {
  if (!isSupabaseConfigured || !supabase || !userId) return getLocalAddresses() || addresses;
  const { data, error } = await supabase
    .from("addresses")
    .select("id, label, line1, city, distance_km, is_default")
    .eq("user_id", userId)
    .order("is_default", { ascending: false });
  if (error) {
    console.warn("Could not load Supabase addresses. Falling back to mock addresses.", error);
    return addresses;
  }

  return data.map((address) => ({
    id: address.id,
    label: address.label,
    line1: address.line1,
    city: address.city,
    distanceKm: Number(address.distance_km || 0),
    default: address.is_default,
  }));
}

export async function saveUserAddress(userId: string | undefined, address: Omit<Address, "id"> & { id?: string }): Promise<Address> {
  const nextAddress: Address = {
    id: address.id || crypto.randomUUID(),
    label: address.label,
    line1: address.line1,
    city: address.city,
    distanceKm: address.distanceKm,
    default: address.default,
  };

  if (!isSupabaseConfigured || !supabase || !userId) {
    const current = getLocalAddresses() || addresses;
    const updated = [nextAddress, ...current.filter((item) => item.id !== nextAddress.id)].map((item) => ({
      ...item,
      default: nextAddress.default ? item.id === nextAddress.id : item.default,
    }));
    saveLocalAddresses(updated);
    return nextAddress;
  }

  if (nextAddress.default) {
    await supabase.from("addresses").update({ is_default: false }).eq("user_id", userId);
  }

  const { data, error } = await supabase
    .from("addresses")
    .upsert(
      {
        id: nextAddress.id,
        user_id: userId,
        label: nextAddress.label,
        line1: nextAddress.line1,
        city: nextAddress.city,
        distance_km: nextAddress.distanceKm,
        is_default: Boolean(nextAddress.default),
      },
      { onConflict: "id" }
    )
    .select("id, label, line1, city, distance_km, is_default")
    .single();

  if (error) throw error;
  return {
    id: data.id,
    label: data.label,
    line1: data.line1,
    city: data.city,
    distanceKm: Number(data.distance_km || 0),
    default: data.is_default,
  };
}

export async function deleteUserAddress(userId: string | undefined, addressId: string) {
  if (!isSupabaseConfigured || !supabase || !userId) {
    saveLocalAddresses((getLocalAddresses() || addresses).filter((address) => address.id !== addressId));
    return;
  }

  const { error } = await supabase.from("addresses").delete().eq("user_id", userId).eq("id", addressId);
  if (error) throw error;
}

export async function setDefaultUserAddress(userId: string | undefined, addressId: string) {
  if (!isSupabaseConfigured || !supabase || !userId) {
    saveLocalAddresses((getLocalAddresses() || addresses).map((address) => ({ ...address, default: address.id === addressId })));
    return;
  }

  const { error: clearError } = await supabase.from("addresses").update({ is_default: false }).eq("user_id", userId);
  if (clearError) throw clearError;
  const { error } = await supabase.from("addresses").update({ is_default: true }).eq("user_id", userId).eq("id", addressId);
  if (error) throw error;
}

export async function fetchUserFavorites(userId?: string): Promise<Food[]> {
  if (!isSupabaseConfigured || !supabase || !userId) return foods.filter((food) => food.isRecommended).slice(0, 6);
  const { data, error } = await supabase
    .from("favorites")
    .select(`
      foods (
        id,
        name,
        slug,
        description,
        price,
        image_url,
        ingredients,
        calories,
        preparation_time,
        rating,
        popularity,
        is_special,
        is_recommended,
        categories (name)
      )
    `)
    .eq("user_id", userId);
  if (error) {
    console.warn("Could not load Supabase favorites. Falling back to recommended foods.", error);
    return foods.filter((food) => food.isRecommended).slice(0, 6);
  }

  return data.map((item: any) => {
    const food = Array.isArray(item.foods) ? item.foods[0] : item.foods;
    return {
      id: food.id,
      name: food.name,
      slug: food.slug,
      category: food.categories?.name || "Rice",
      description: food.description,
      price: Number(food.price),
      image: food.image_url,
      ingredients: food.ingredients || [],
      calories: food.calories || 0,
      prepTime: food.preparation_time || 0,
      rating: Number(food.rating || 0),
      reviews: food.popularity || 0,
      popularity: food.popularity || 0,
      tags: [food.categories?.name || "Rice"],
      isSpecial: food.is_special,
      isRecommended: food.is_recommended,
    };
  });
}

export async function removeUserFavorite(userId: string | undefined, foodId: string) {
  if (!isSupabaseConfigured || !supabase || !userId) return;
  const { error } = await supabase.from("favorites").delete().eq("user_id", userId).eq("food_id", foodId);
  if (error) throw error;
}

export async function fetchUserOrderSummaries(userId?: string): Promise<string[]> {
  const orders = await fetchAdminOrders(userId);
  return orders
    .map((order) => `${order.id}: ${order.status.replace(/_/g, " ")} - ${order.items.length} item${order.items.length === 1 ? "" : "s"}`);
}

export async function fetchUserOrders(userId?: string): Promise<StoredOrder[]> {
  return fetchAdminOrders(userId);
}

export async function fetchUserNotifications(userId?: string): Promise<NotificationItem[]> {
  if (!isSupabaseConfigured || !supabase || !userId) return notifications;
  const { data, error } = await supabase
    .from("notifications")
    .select("id, title, body, read_at, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) {
    console.warn("Could not load Supabase notifications. Falling back to mock notifications.", error);
    return notifications;
  }

  return data.map((item) => ({
    id: item.id,
    title: item.title,
    body: item.body,
    read: Boolean(item.read_at),
    createdAt: item.created_at,
  }));
}

export async function markNotificationRead(userId: string | undefined, notificationId: string) {
  if (!isSupabaseConfigured || !supabase || !userId) return;
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("id", notificationId);
  if (error) throw error;
}

export async function markAllNotificationsRead(userId: string | undefined) {
  if (!isSupabaseConfigured || !supabase || !userId) return;
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("read_at", null);
  if (error) throw error;
}

export async function deleteNotification(userId: string | undefined, notificationId: string) {
  if (!isSupabaseConfigured || !supabase || !userId) return;
  const { error } = await supabase.from("notifications").delete().eq("user_id", userId).eq("id", notificationId);
  if (error) throw error;
}

export async function updateUserProfile(userId: string | undefined, profile: { fullName: string; phone?: string; avatarUrl?: string }) {
  if (!isSupabaseConfigured || !supabase || !userId) {
    const current = JSON.parse(localStorage.getItem("savoury-demo-user") || "{}");
    localStorage.setItem("savoury-demo-user", JSON.stringify({ ...current, fullName: profile.fullName, phone: profile.phone }));
    return;
  }

  const { error } = await supabase
    .from("profiles")
    .update({ full_name: profile.fullName, phone: profile.phone || null, avatar_url: profile.avatarUrl || null })
    .eq("id", userId);
  if (error) throw error;
}
