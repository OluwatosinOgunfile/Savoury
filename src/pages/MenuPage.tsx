import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search, SlidersHorizontal } from "lucide-react";
import { FoodCard } from "@/components/FoodCard";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { categories } from "@/data/catalog";
import { useFoodSearch } from "@/hooks/useFoodSearch";
import { fetchCategories, fetchFoods, foodKeys } from "@/services/foodService";
import type { FoodCategory } from "@/types";

export function MenuPage() {
  const [params] = useSearchParams();
  const startingCategory = (params.get("category") as FoodCategory | null) || "All";
  const startingSearch = params.get("search") || "";
  const { data: menuCategories = categories } = useQuery({ queryKey: foodKeys.categories, queryFn: fetchCategories });
  const { data: queriedFoods } = useQuery({ queryKey: foodKeys.all, queryFn: fetchFoods });
  const { filters, setFilters, results } = useFoodSearch(startingCategory, queriedFoods, startingSearch);

  useEffect(() => {
    setFilters((current) => ({
      ...current,
      category: startingCategory,
      query: startingSearch,
    }));
  }, [setFilters, startingCategory, startingSearch]);

  return (
    <main className="app-container py-8 text-white">
      <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="font-black uppercase text-savoury-primary">Menu</p>
          <h1 className="section-title">Search, filter, and order fast</h1>
          <p className="mt-2 text-zinc-400">Search by meal name, category, price, and popularity. Filter by price, category, rating, preparation time, popular, and newest.</p>
        </div>
        <Button variant="outline">
          <SlidersHorizontal className="h-4 w-4" />
          {results.length} meals
        </Button>
      </div>
      <Card className="mb-6 border-white/10 bg-[#1d1d1d]">
        <CardContent className="grid gap-4 lg:grid-cols-[1.2fr_repeat(4,1fr)]">
          <label className="relative">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />
            <Input className="pl-11" placeholder="Search meals, categories, prices..." value={filters.query} onChange={(event) => setFilters({ ...filters, query: event.target.value })} />
          </label>
          <select className="h-12 rounded-xl border border-white/10 bg-[#101010] px-4 text-sm text-white" value={filters.category} onChange={(event) => setFilters({ ...filters, category: event.target.value as "All" | FoodCategory })}>
            <option>All</option>
            {menuCategories.map((category) => <option key={category.id}>{category.name}</option>)}
          </select>
          <select className="h-12 rounded-xl border border-white/10 bg-[#101010] px-4 text-sm text-white" value={filters.sort} onChange={(event) => setFilters({ ...filters, sort: event.target.value as typeof filters.sort })}>
            <option value="popular">Popular</option>
            <option value="newest">Newest</option>
            <option value="price">Lowest price</option>
            <option value="rating">Top rating</option>
          </select>
          <Input type="number" min={1000} max={30000} value={filters.maxPrice} onChange={(event) => setFilters({ ...filters, maxPrice: Number(event.target.value) })} aria-label="Maximum price" />
          <Input type="number" min={5} max={60} value={filters.maxPrepTime} onChange={(event) => setFilters({ ...filters, maxPrepTime: Number(event.target.value) })} aria-label="Maximum preparation time" />
        </CardContent>
      </Card>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {results.map((food) => <FoodCard key={food.id} food={food} />)}
      </div>
    </main>
  );
}
