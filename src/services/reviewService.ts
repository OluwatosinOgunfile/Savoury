import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import type { CartItem } from "@/types";

const localReviewsKey = "savoury-order-reviews";

export async function saveOrderReview(payload: {
  userId?: string;
  customerName: string;
  orderId: string;
  items: CartItem[];
  rating: number;
  comment: string;
}) {
  if (!isSupabaseConfigured || !supabase || !payload.userId) {
    const current = JSON.parse(localStorage.getItem(localReviewsKey) || "[]");
    localStorage.setItem(localReviewsKey, JSON.stringify([{ ...payload, createdAt: new Date().toISOString() }, ...current]));
    return;
  }

  const uniqueFoodIds = Array.from(new Set(payload.items.map((item) => item.food.id)));
  const reviews = uniqueFoodIds.map((foodId) => ({
    user_id: payload.userId,
    food_id: foodId,
    rating: payload.rating,
    comment: `Order ${payload.orderId}: ${payload.comment}`,
  }));

  const { error } = await supabase.from("reviews").insert(reviews);
  if (error) throw error;
}
