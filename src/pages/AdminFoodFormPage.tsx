import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ImagePlus, Save } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { categories, foods } from "@/data/catalog";
import { mergeAdminFoods, saveAdminFood } from "@/services/adminMenuStorage";
import { fetchCategories, fetchFoods, foodKeys, saveFoodToDatabase } from "@/services/foodService";
import type { Food, FoodCategory } from "@/types";

interface FoodForm {
  name: string;
  price: string;
  category: FoodCategory;
  image: string;
  prepTime: string;
  calories: string;
  stockQuantity: string;
  description: string;
}

const emptyForm: FoodForm = {
  name: "",
  price: "",
  category: "Rice",
  image: "/images/savoury-hero.png",
  prepTime: "20",
  calories: "500",
  stockQuantity: "50",
  description: "",
};

export function AdminFoodFormPage() {
  const { foodId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: menuFoods = foods } = useQuery({ queryKey: foodKeys.all, queryFn: fetchFoods });
  const { data: menuCategories = categories } = useQuery({ queryKey: foodKeys.categories, queryFn: fetchCategories });
  const allFoods = useMemo(() => mergeAdminFoods(menuFoods), [menuFoods]);
  const existingFood = foodId ? allFoods.find((food) => food.id === foodId) : undefined;
  const [form, setForm] = useState<FoodForm>(emptyForm);
  const [message, setMessage] = useState("Choose a photo from your device and fill in the food details.");

  useEffect(() => {
    if (!existingFood) return;
    setForm({
      name: existingFood.name,
      price: String(existingFood.price),
      category: existingFood.category,
      image: existingFood.image,
      prepTime: String(existingFood.prepTime),
      calories: String(existingFood.calories),
      stockQuantity: String(existingFood.stockQuantity ?? 50),
      description: existingFood.description,
    });
  }, [existingFood]);

  const pickImage = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setMessage("Please select a valid image file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setForm((current) => ({ ...current, image: String(reader.result) }));
      setMessage(`${file.name} selected.`);
    };
    reader.readAsDataURL(file);
  };

  const saveFood = async (event: FormEvent) => {
    event.preventDefault();
    const price = Number(form.price);
    const prepTime = Number(form.prepTime);
    const calories = Number(form.calories);
    const stockQuantity = Number(form.stockQuantity);

    if (!form.name.trim() || !Number.isFinite(price) || price <= 0) {
      setMessage("Enter a food name and a valid price before saving.");
      return;
    }

    const nextFood: Food = {
      id: existingFood?.id || `admin-${Date.now()}`,
      slug: form.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
      name: form.name.trim(),
      category: form.category,
      description: form.description.trim() || `Fresh ${form.name.trim()} prepared by Savoury's kitchen.`,
      price,
      image: form.image || "/images/savoury-hero.png",
      ingredients: [form.category, "Savoury seasoning"],
      calories: Number.isFinite(calories) ? calories : 0,
      prepTime: Number.isFinite(prepTime) ? prepTime : 20,
      stockQuantity: Number.isFinite(stockQuantity) ? Math.max(0, Math.floor(stockQuantity)) : 50,
      rating: existingFood?.rating || 4.8,
      reviews: existingFood?.reviews || 0,
      popularity: existingFood?.popularity || 75,
      tags: [form.category, "Admin"],
      isRecommended: true,
      isNew: !existingFood,
    };

    try {
      const savedFood = await saveFoodToDatabase(nextFood);
      saveAdminFood(savedFood);
      await queryClient.invalidateQueries({ queryKey: foodKeys.all });
      navigate("/admin/menu", { replace: true });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save food to Supabase.");
    }
  };

  return (
    <main className="app-container py-8">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="font-black uppercase text-savoury-primary">Menu management</p>
          <h1 className="section-title text-4xl md:text-5xl">{existingFood ? "Edit Food" : "Add Food"}</h1>
          <p className="mt-2 text-zinc-500">{message}</p>
        </div>
        <Link to="/admin"><Button variant="outline"><ArrowLeft className="h-4 w-4" /> Back to Dashboard</Button></Link>
      </div>

      <form className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]" onSubmit={saveFood}>
        <Card>
          <CardContent>
            <h2 className="text-xl font-black">Food Photo</h2>
            <div className="mt-4 overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50 dark:border-white/10 dark:bg-white/5">
              <img src={form.image} alt="Food preview" className="h-80 w-full object-cover" />
            </div>
            <label className="mt-4 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-savoury-primary bg-savoury-accent px-4 py-4 text-sm font-black text-savoury-primary transition hover:bg-amber-100 dark:bg-savoury-primary/10 dark:hover:bg-savoury-primary/20">
              <ImagePlus className="h-5 w-5" />
              Upload Photo from Device
              <input type="file" accept="image/*" className="sr-only" onChange={pickImage} />
            </label>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <h2 className="text-xl font-black">Food Details</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Input placeholder="Food name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
              <Input placeholder="Price" type="number" min={1} value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} />
              <select className="h-12 rounded-xl border border-zinc-200 bg-white px-4 text-sm font-bold text-zinc-950 dark:border-white/10 dark:bg-zinc-950 dark:text-white" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value as FoodCategory })}>
                {menuCategories.map((category) => <option key={category.id} value={category.name}>{category.name}</option>)}
              </select>
              <Input placeholder="Preparation time" type="number" min={1} value={form.prepTime} onChange={(event) => setForm({ ...form, prepTime: event.target.value })} />
              <Input placeholder="Calories" type="number" min={0} value={form.calories} onChange={(event) => setForm({ ...form, calories: event.target.value })} />
              <Input placeholder="Stock quantity" type="number" min={0} value={form.stockQuantity} onChange={(event) => setForm({ ...form, stockQuantity: event.target.value })} />
              <textarea className="min-h-32 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-950 outline-none placeholder:text-zinc-500 dark:border-white/10 dark:bg-zinc-950 dark:text-white md:col-span-2" placeholder="Description" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
              <Button className="md:col-span-2" type="submit" size="lg"><Save className="h-5 w-5" /> {existingFood ? "Update Food" : "Save Food"}</Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </main>
  );
}
