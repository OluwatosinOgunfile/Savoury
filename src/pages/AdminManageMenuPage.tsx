import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Edit, PackagePlus, RotateCcw, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { categories, foods } from "@/data/catalog";
import { formatCurrency } from "@/lib/utils";
import { deleteAdminFood, mergeAdminFoods } from "@/services/adminMenuStorage";
import { deleteFoodFromDatabase, fetchCategories, fetchFoods, foodKeys } from "@/services/foodService";
import type { Food, FoodCategory } from "@/types";

export function AdminManageMenuPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: menuFoods = foods } = useQuery({ queryKey: foodKeys.all, queryFn: fetchFoods });
  const { data: menuCategories = categories } = useQuery({ queryKey: foodKeys.categories, queryFn: fetchCategories });
  const [adminFoods, setAdminFoods] = useState<Food[]>(() => mergeAdminFoods(menuFoods));
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<"All" | FoodCategory>("All");
  const [deleteTarget, setDeleteTarget] = useState<Food | null>(null);
  const [feedback, setFeedback] = useState("Manage every food item from one dedicated page.");

  useEffect(() => {
    setAdminFoods(mergeAdminFoods(menuFoods));
  }, [menuFoods]);

  const filteredFoods = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return adminFoods.filter((food) => {
      const matchesQuery = !normalized || [food.name, food.category, food.description].some((value) => value.toLowerCase().includes(normalized));
      const matchesCategory = category === "All" || food.category === category;
      return matchesQuery && matchesCategory;
    });
  }, [adminFoods, category, query]);

  const resetMenu = () => {
    localStorage.removeItem("savoury-admin-foods");
    setAdminFoods(menuFoods);
    setDeleteTarget(null);
    setFeedback("Menu manager reset to Supabase data.");
  };

  const removeFood = async (food: Food) => {
    try {
      await deleteFoodFromDatabase(food.id);
      await queryClient.invalidateQueries({ queryKey: foodKeys.all });
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Could not delete food from Supabase.");
      return;
    }
    deleteAdminFood(food.id);
    setAdminFoods((current) => current.filter((item) => item.id !== food.id));
    setDeleteTarget(null);
    setFeedback(`${food.name} removed from the live menu.`);
  };

  return (
    <main className="app-container py-8">
      <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="font-black uppercase text-savoury-primary">Admin menu</p>
          <h1 className="section-title text-4xl md:text-5xl">Manage Menu</h1>
          <p className="mt-2 text-zinc-500">{feedback}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/admin"><Button variant="outline"><ArrowLeft className="h-4 w-4" /> Dashboard</Button></Link>
          <Button onClick={() => navigate("/admin/foods/new")}><PackagePlus className="h-4 w-4" /> Add Food</Button>
        </div>
      </div>

      <Card>
        <CardContent>
          <div className="grid gap-4 lg:grid-cols-[1fr_220px_auto]">
            <label className="relative">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />
              <Input className="pl-11" placeholder="Search food, category, description..." value={query} onChange={(event) => setQuery(event.target.value)} />
            </label>
            <select className="h-12 rounded-xl border border-zinc-200 bg-white px-4 text-sm font-bold text-zinc-950 dark:border-white/10 dark:bg-zinc-950 dark:text-white" value={category} onChange={(event) => setCategory(event.target.value as "All" | FoodCategory)}>
              <option>All</option>
              {menuCategories.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}
            </select>
            <Button variant="outline" onClick={resetMenu}><RotateCcw className="h-4 w-4" /> Reset Menu</Button>
          </div>
        </CardContent>
      </Card>

      <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredFoods.map((food) => (
          <Card key={food.id}>
            <CardContent>
              <img src={food.image} alt={food.name} onError={(event) => { event.currentTarget.src = "/images/savoury-hero.png"; }} className="h-48 w-full rounded-xl object-cover" />
              <div className="mt-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate text-xl font-black">{food.name}</h2>
                  <p className="mt-1 text-sm font-bold text-zinc-500">{food.category} | {food.prepTime} min | {food.calories} kcal</p>
                  <p className={`mt-1 text-xs font-black ${(food.stockQuantity ?? 50) <= 0 ? "text-red-500" : "text-emerald-500"}`}>
                    {(food.stockQuantity ?? 50) <= 0 ? "Out of stock" : `${food.stockQuantity ?? 50} in stock`}
                  </p>
                </div>
                <p className="shrink-0 font-black text-savoury-primary">{formatCurrency(food.price)}</p>
              </div>
              <p className="mt-3 line-clamp-2 text-sm text-zinc-500">{food.description}</p>
              <div className="mt-5 flex gap-2">
                <Button className="flex-1" variant="outline" onClick={() => navigate(`/admin/foods/${food.id}/edit`)}><Edit className="h-4 w-4" /> Edit</Button>
                <Button className="flex-1" variant="ghost" onClick={() => setDeleteTarget(food)}><Trash2 className="h-4 w-4" /> Delete</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      {filteredFoods.length === 0 && (
        <Card className="mt-6">
          <CardContent className="text-center">
            <p className="font-black">No food items match your filters.</p>
          </CardContent>
        </Card>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
          <Card className="w-full max-w-md">
            <CardContent>
              <h2 className="text-xl font-black">Delete {deleteTarget.name}?</h2>
              <p className="mt-2 text-sm font-semibold text-zinc-500">This hides the item from the live menu while keeping old order records intact.</p>
              <div className="mt-5 flex gap-2">
                <Button onClick={() => removeFood(deleteTarget)}>Confirm Delete</Button>
                <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </main>
  );
}
