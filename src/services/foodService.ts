import { categories, coupons, foods, reviews } from "@/data/catalog";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import type { Category, Coupon, Food, FoodCategory, Review } from "@/types";

export const foodKeys = {
  all: ["foods"] as const,
  categories: ["categories"] as const,
  settings: ["restaurant-settings"] as const,
  reviews: (foodId: string) => ["reviews", foodId] as const,
  coupons: ["coupons"] as const,
};

function mapFood(food: any): Food {
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
    rating: Number(food.rating),
    reviews: food.popularity || 0,
    popularity: food.popularity || 0,
    tags: [food.categories?.name || "Rice", food.is_special ? "Special" : "Fresh"],
    isSpecial: food.is_special,
    isRecommended: food.is_recommended,
    isTrending: food.popularity > 100,
    isNew: food.popularity < 75,
  } as Food;
}

export async function fetchFoods(): Promise<Food[]> {
  if (!isSupabaseConfigured || !supabase) return foods;
  const { data, error } = await supabase.from("foods").select("*, categories(name)").order("popularity", { ascending: false });
  if (error) throw error;
  return data.map(mapFood);
}

export async function fetchCategories(): Promise<Category[]> {
  if (!isSupabaseConfigured || !supabase) return categories;
  const { data, error } = await supabase.from("categories").select("*").order("name");
  if (error) throw error;
  return data.map((category) => ({
    id: category.id,
    name: category.name,
    parent: undefined,
    icon: category.icon || "Utensils",
    description: category.description || "",
  })) as Category[];
}

export async function fetchCoupons(): Promise<Coupon[]> {
  if (!isSupabaseConfigured || !supabase) return coupons;
  const { data, error } = await supabase
    .from("coupons")
    .select("code, discount_type, value, min_order")
    .eq("is_active", true)
    .order("code");
  if (error) {
    console.warn("Could not load Supabase coupons. Falling back to mock coupons.", error);
    return coupons;
  }

  return data.map((coupon) => ({
    code: coupon.code,
    label:
      coupon.discount_type === "percentage"
        ? `${Number(coupon.value)}% off orders above NGN ${Number(coupon.min_order).toLocaleString()}`
        : `NGN ${Number(coupon.value).toLocaleString()} off orders above NGN ${Number(coupon.min_order).toLocaleString()}`,
    discountType: coupon.discount_type,
    value: Number(coupon.value),
    minOrder: Number(coupon.min_order),
  })) as Coupon[];
}

export async function saveFoodToDatabase(food: Food): Promise<Food> {
  if (!isSupabaseConfigured || !supabase) return food;

  const { data: category } = await supabase.from("categories").select("id").eq("name", food.category).maybeSingle();
  const payload: Record<string, unknown> = {
    category_id: category?.id || null,
    name: food.name,
    slug: food.slug,
    description: food.description,
    price: food.price,
    image_url: food.image,
    ingredients: food.ingredients,
    calories: food.calories,
    preparation_time: food.prepTime,
    rating: food.rating,
    popularity: food.popularity,
    is_available: true,
    is_special: Boolean(food.isSpecial),
    is_recommended: Boolean(food.isRecommended),
  };

  const { data, error } = await supabase
    .from("foods")
    .upsert(food.id.startsWith("admin-") ? payload : { id: food.id, ...payload }, { onConflict: "slug" })
    .select("*, categories(name)")
    .single();

  if (error) throw error;
  return mapFood(data);
}

export async function deleteFoodFromDatabase(foodId: string) {
  if (!isSupabaseConfigured || !supabase) return;
  const { error } = await supabase.from("foods").delete().eq("id", foodId);
  if (error) throw error;
}

export function isKnownFoodCategory(value: string): value is FoodCategory {
  return categories.some((category) => category.name === value);
}

export async function fetchReviews(foodId: string): Promise<Review[]> {
  if (!isSupabaseConfigured || !supabase) return reviews.filter((review) => review.foodId === foodId || review.foodId === "jollof-feast");
  const { data, error } = await supabase.from("reviews").select("*").eq("food_id", foodId).order("created_at", { ascending: false });
  if (error) throw error;
  return data.map((review) => ({
    id: review.id,
    foodId: review.food_id,
    user: "Verified customer",
    rating: review.rating,
    comment: review.comment,
    image: review.image_url,
    helpful: review.helpful_count,
    createdAt: review.created_at,
  }));
}

export async function fetchRestaurantSettings() {
  if (!isSupabaseConfigured || !supabase) return null;
  const { data, error } = await supabase
    .from("restaurant_settings")
    .select("*")
    .eq("name", "Savoury")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return null;
  return data;
}
