import { useMemo, useState } from "react";
import type { Food } from "@/types";

export function useFavorites() {
  const [favoriteIds, setFavoriteIds] = useState<string[]>(["jollof-feast", "pounded-yam-egusi"]);

  const toggleFavorite = (food: Food) => {
    setFavoriteIds((current) => (current.includes(food.id) ? current.filter((id) => id !== food.id) : [...current, food.id]));
  };

  return useMemo(() => ({ favoriteIds, toggleFavorite }), [favoriteIds]);
}
