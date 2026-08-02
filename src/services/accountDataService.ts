import { addresses, foods, notifications } from "@/data/catalog";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { fetchAdminOrders } from "@/services/orderStorage";
import type { Address, Food, NotificationItem } from "@/types";

export const accountKeys = {
  addresses: (userId?: string) => ["account-addresses", userId || "guest"] as const,
  favorites: (userId?: string) => ["account-favorites", userId || "guest"] as const,
  orders: (userId?: string) => ["account-orders", userId || "guest"] as const,
  notifications: (userId?: string) => ["account-notifications", userId || "guest"] as const,
};

export async function fetchUserAddresses(userId?: string): Promise<Address[]> {
  if (!isSupabaseConfigured || !supabase || !userId) return addresses;
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

export async function fetchUserOrderSummaries(userId?: string): Promise<string[]> {
  const orders = await fetchAdminOrders(userId);
  return orders
    .map((order) => `${order.id}: ${order.status.replace(/_/g, " ")} - ${order.items.length} item${order.items.length === 1 ? "" : "s"}`);
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
