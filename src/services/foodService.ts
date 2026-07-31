import { categories, foods, reviews } from "@/data/catalog";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import type { Category, Food, Review } from "@/types";

export const foodKeys = {
  all: ["foods"] as const,
  categories: ["categories"] as const,
  settings: ["restaurant-settings"] as const,
  reviews: (foodId: string) => ["reviews", foodId] as const,
};

export async function fetchFoods(): Promise<Food[]> {
  if (!isSupabaseConfigured || !supabase) return foods;
  const { data, error } = await supabase.from("foods").select("*, categories(name)").order("popularity", { ascending: false });
  if (error) throw error;
  return data.map((food) => ({
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
  })) as Food[];
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
