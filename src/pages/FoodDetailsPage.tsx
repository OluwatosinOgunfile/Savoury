import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Clock, Flame, Heart, Star, type LucideIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { FoodCard } from "@/components/FoodCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { foods, reviews } from "@/data/catalog";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import { formatCurrency } from "@/lib/utils";
import { setFavoriteFood } from "@/services/favoriteService";
import { fetchFoods, fetchReviews, foodKeys } from "@/services/foodService";

export function FoodDetailsPage() {
  const { slug } = useParams();
  const { data: menuFoods = foods } = useQuery({ queryKey: foodKeys.all, queryFn: fetchFoods });
  const food = menuFoods.find((item) => item.slug === slug) || menuFoods[0] || foods[0];
  const [quantity, setQuantity] = useState(1);
  const [favorite, setFavorite] = useState(false);
  const [imageSrc, setImageSrc] = useState(food.image || "/images/savoury-hero.png");
  const { addItem } = useCart();
  const { user } = useAuth();
  const related = useMemo(() => menuFoods.filter((item) => item.category === food.category && item.id !== food.id).slice(0, 4), [food, menuFoods]);
  const stock = food.stockQuantity ?? 50;
  const outOfStock = stock <= 0;
  const { data: foodReviews = reviews.filter((review) => review.foodId === food.id || review.foodId === "jollof-feast") } = useQuery({
    queryKey: foodKeys.reviews(food.id),
    queryFn: () => fetchReviews(food.id),
  });
  useEffect(() => {
    setImageSrc(food.image || "/images/savoury-hero.png");
  }, [food.image]);

  useEffect(() => {
    setQuantity((current) => Math.max(1, Math.min(stock || 1, current)));
  }, [stock]);
  const toggleFavorite = async () => {
    const nextFavorite = !favorite;
    setFavorite(nextFavorite);
    try {
      await setFavoriteFood(user?.id, food.id, nextFavorite);
    } catch {
      setFavorite(favorite);
    }
  };

  return (
    <main className="app-container py-8 text-white">
      <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="overflow-hidden rounded-2xl border border-white/10 bg-[#202020] shadow-premium">
          <img src={imageSrc} alt={food.name} onError={() => setImageSrc("/images/savoury-hero.png")} className="h-[360px] w-full object-cover lg:h-[560px]" />
        </motion.div>
        <div className="space-y-5">
          <div>
            <Badge>{food.category}</Badge>
            <h1 className="mt-4 text-4xl font-black tracking-tight text-white">{food.name}</h1>
            <p className="mt-3 text-zinc-400">{food.description}</p>
            <p className={`mt-3 text-sm font-black ${outOfStock ? "text-red-400" : "text-emerald-400"}`}>
              {outOfStock ? "Out of stock" : `${stock} in stock`}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Stat icon={Star} label="Rating" value={`${food.rating}/5`} />
            <Stat icon={Clock} label="Prep" value={`${food.prepTime} min`} />
            <Stat icon={Flame} label="Calories" value={`${food.calories}`} />
          </div>
          <Card className="dark-surface">
            <CardContent>
              <h2 className="font-black text-white">Ingredients</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {food.ingredients.map((ingredient) => <span key={ingredient} className="rounded-full bg-white/10 px-3 py-1 text-sm font-bold text-zinc-200">{ingredient}</span>)}
              </div>
            </CardContent>
          </Card>
          <Card className="dark-surface">
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-3xl font-black text-savoury-primary">{formatCurrency(food.price)}</span>
                <Button variant="outline" size="icon" aria-label="Favorite meal" onClick={toggleFavorite}><Heart className={`h-5 w-5 ${favorite ? "fill-current text-savoury-primary" : ""}`} /></Button>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="outline" size="icon" onClick={() => setQuantity(Math.max(1, quantity - 1))} disabled={outOfStock}>-</Button>
                <span className="grid h-11 w-14 place-items-center rounded-xl bg-white/10 font-black">{quantity}</span>
                <Button variant="outline" size="icon" onClick={() => setQuantity(Math.min(stock, quantity + 1))} disabled={outOfStock || quantity >= stock}>+</Button>
                <Button className="flex-1" onClick={() => addItem(food, quantity)} disabled={outOfStock}>{outOfStock ? "Out of stock" : "Add to cart"}</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <section className="mt-10 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <Card className="dark-surface">
          <CardContent>
            <h2 className="section-title">Customer Reviews</h2>
            <div className="mt-4 space-y-4">
              {foodReviews.map((review) => (
                <div key={review.id} className="rounded-xl border border-white/10 bg-[#171717] p-4">
                  <div className="flex items-center justify-between">
                    <strong>{review.user}</strong>
                    <span className="font-bold text-savoury-primary">{review.rating}/5</span>
                  </div>
                  <p className="mt-2 text-sm text-zinc-400">{review.comment}</p>
                  <button className="mt-2 text-sm font-bold text-savoury-primary">{review.helpful} found helpful</button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="section-title">Related Meals</h2>
            <Link to="/menu" className="font-bold text-savoury-primary">View menu</Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {(related.length ? related : menuFoods.slice(0, 4)).map((item) => <FoodCard key={item.id} food={item} compact />)}
          </div>
        </div>
      </section>
    </main>
  );
}

function Stat({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <Card className="dark-surface">
      <CardContent className="p-4">
        <Icon className="h-5 w-5 text-savoury-primary" />
        <p className="mt-2 text-xs font-bold uppercase text-zinc-400">{label}</p>
        <p className="font-black text-white">{value}</p>
      </CardContent>
    </Card>
  );
}
