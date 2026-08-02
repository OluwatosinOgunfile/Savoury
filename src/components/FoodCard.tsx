import { Link } from "react-router-dom";
import { Clock, Heart, Plus, Star } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import { formatCurrency } from "@/lib/utils";
import { setFavoriteFood } from "@/services/favoriteService";
import type { Food } from "@/types";

export function FoodCard({ food, compact = false }: { food: Food; compact?: boolean }) {
  const { addItem } = useCart();
  const { user } = useAuth();
  const [favorite, setFavorite] = useState(false);
  const [imageSrc, setImageSrc] = useState(food.image);

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
    <motion.article initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -4 }} transition={{ duration: 0.22 }}>
      <Card className="group h-full overflow-hidden border-white/10 bg-[#242424]">
        <div className={compact ? "relative h-36 overflow-hidden" : "relative h-48 overflow-hidden"}>
          <Link to={`/food/${food.slug}`} className="block h-full">
            <img src={imageSrc} alt={food.name} loading="lazy" onError={() => setImageSrc("/images/savoury-hero.png")} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
          </Link>
          <div className="absolute left-3 top-3 flex gap-2">
            {food.isSpecial && <Badge>Special</Badge>}
            {food.isTrending && <Badge className="bg-white text-zinc-950">Trending</Badge>}
          </div>
          <button
            className={`absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-xl bg-white/90 shadow-soft transition ${favorite ? "text-savoury-primary" : "text-zinc-500 hover:text-savoury-primary"}`}
            aria-label={`${favorite ? "Remove from" : "Add to"} favorites: ${food.name}`}
            onClick={toggleFavorite}
          >
            <Heart className={`h-5 w-5 ${favorite ? "fill-current" : ""}`} />
          </button>
        </div>
        <div className="space-y-3 p-4">
          <div>
            <div className="flex items-start justify-between gap-3">
              <Link to={`/food/${food.slug}`} className="text-base font-black text-white hover:text-savoury-secondary">
                {food.name}
              </Link>
              <span className="font-black text-savoury-primary">{formatCurrency(food.price)}</span>
            </div>
            <p className="mt-1 line-clamp-2 text-sm text-zinc-400">{food.description}</p>
          </div>
          <div className="flex items-center justify-between gap-3 text-sm text-zinc-400">
            <span className="inline-flex items-center gap-1">
              <Star className="h-4 w-4 fill-savoury-secondary stroke-savoury-secondary" />
              {food.rating} ({food.reviews})
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {food.prepTime} min
            </span>
          </div>
          <Button className="w-full" onClick={() => addItem(food)}>
            <Plus className="h-4 w-4" />
            Add to cart
          </Button>
        </div>
      </Card>
    </motion.article>
  );
}
