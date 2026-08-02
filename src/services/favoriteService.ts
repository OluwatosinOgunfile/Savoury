import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export async function setFavoriteFood(userId: string | undefined, foodId: string, favorite: boolean) {
  if (!isSupabaseConfigured || !supabase || !userId) return;

  if (favorite) {
    const { error } = await supabase.from("favorites").upsert({ user_id: userId, food_id: foodId }, { onConflict: "user_id,food_id" });
    if (error) throw error;
    return;
  }

  const { error } = await supabase.from("favorites").delete().eq("user_id", userId).eq("food_id", foodId);
  if (error) throw error;
}
