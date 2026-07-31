import { useMemo, useState } from "react";
import { foods } from "@/data/catalog";
import type { Food, FoodCategory } from "@/types";

export interface FoodFilters {
  query: string;
  category: "All" | FoodCategory;
  maxPrice: number;
  minRating: number;
  maxPrepTime: number;
  sort: "popular" | "newest" | "price" | "rating";
}

export function useFoodSearch(initialCategory: "All" | FoodCategory = "All", sourceFoods: Food[] = foods, initialQuery = "") {
  const [filters, setFilters] = useState<FoodFilters>({
    query: initialQuery,
    category: initialCategory,
    maxPrice: 15000,
    minRating: 0,
    maxPrepTime: 45,
    sort: "popular",
  });

  const results = useMemo(() => {
    const query = filters.query.toLowerCase();
    return sourceFoods
      .filter((food) => {
        const searchable = `${food.name} ${food.category} ${food.price} ${food.popularity}`.toLowerCase();
        return (
          searchable.includes(query) &&
          (filters.category === "All" || food.category === filters.category) &&
          food.price <= filters.maxPrice &&
          food.rating >= filters.minRating &&
          food.prepTime <= filters.maxPrepTime
        );
      })
      .sort((a, b) => {
        if (filters.sort === "newest") return Number(Boolean(b.isNew)) - Number(Boolean(a.isNew));
        if (filters.sort === "price") return a.price - b.price;
        if (filters.sort === "rating") return b.rating - a.rating;
        return b.popularity - a.popularity;
      });
  }, [filters, sourceFoods]);

  return { filters, setFilters, results };
}
