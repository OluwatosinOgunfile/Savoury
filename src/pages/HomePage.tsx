import { FormEvent, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowRight,
  CakeSlice,
  Clock,
  Flame,
  Gift,
  Heart,
  Leaf,
  Pizza,
  Rocket,
  Search,
  ShieldCheck,
  ShoppingCart,
  Soup,
  Sparkles,
  Star,
  Trophy,
  Truck,
  Utensils,
  Wheat,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { categories, foods, restaurantSettings } from "@/data/catalog";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import { formatCurrency } from "@/lib/utils";
import { setFavoriteFood } from "@/services/favoriteService";
import { fetchCategories, fetchFoods, fetchRestaurantSettings, foodKeys } from "@/services/foodService";
import type { Category, Food } from "@/types";

const categoryIcons: Record<string, LucideIcon> = {
  Rice: Wheat,
  "Jollof Rice": Flame,
  "Fried Rice": Leaf,
  Soups: Soup,
  Egusi: Soup,
  Grills: Flame,
  Chicken: Flame,
  Shawarma: Utensils,
  Pizza,
  Burgers: Utensils,
  Drinks: Utensils,
  Smoothies: Leaf,
  Desserts: CakeSlice,
};

const promos = [
  { title: "Free Delivery", copy: "Use code FREESHIP", code: "FREESHIP", tone: "from-blue-600 to-blue-500", icon: Rocket },
  { title: "20% Off", copy: "Orders above NGN 5,000", code: "FEAST20", tone: "from-red-700 to-red-500", icon: Sparkles },
  { title: "Welcome Deal", copy: "10% off first order", code: "WELCOME10", tone: "from-amber-500 to-orange-500", icon: Gift },
];

const features = [
  { icon: Leaf, title: "Fresh Ingredients", copy: "Every meal is prepared with fresh, carefully selected ingredients." },
  { icon: Flame, title: "Fast Delivery", copy: "Hot, fresh meals delivered to your door in as little time as possible." },
  { icon: Trophy, title: "Top Quality", copy: "Awesome-tasting recipes crafted with care." },
  { icon: Heart, title: "Made with Love", copy: "Every dish is prepared with passion and care for your satisfaction." },
];

const testimonials = [
  { name: "Adeaze O.", place: "Lagos", text: "The Jollof Rice is absolutely divine. Best I have had outside of my grandmother's kitchen. Delivery was super fast too.", rating: 5 },
  { name: "Emeka K.", place: "Abuja", text: "Ordered suya and pounded yam combo. It felt like a true naija experience. The portions are generous and taste is authentic.", rating: 5 },
  { name: "Fatima A.", place: "Lagos", text: "The shawarma is hands down the best in town. The sauces are incredible and the bread is always perfectly toasted.", rating: 5 },
];

const referenceHeroImage = "/images/savoury-reference-hero.jpg";

export function HomePage() {
  const navigate = useNavigate();
  const { data: menuFoods = foods, isLoading: loadingFoods } = useQuery({ queryKey: foodKeys.all, queryFn: fetchFoods });
  const { data: menuCategories = categories } = useQuery({ queryKey: foodKeys.categories, queryFn: fetchCategories });
  const { data: dbSettings } = useQuery({ queryKey: foodKeys.settings, queryFn: fetchRestaurantSettings });
  const [query, setQuery] = useState("");

  const settings = {
    ...restaurantSettings,
    name: dbSettings?.name || restaurantSettings.name,
    tagline: dbSettings?.tagline || restaurantSettings.tagline,
    logoUrl: referenceHeroImage,
    openingHours: dbSettings?.opening_hours || restaurantSettings.openingHours,
    deliveryFee: Number(dbSettings?.delivery_base_fee || 500),
    deliveryMin: Number(dbSettings?.estimated_delivery_min || 25),
    deliveryMax: Number(dbSettings?.estimated_delivery_max || 45),
  };

  const specials = useMemo(() => {
    const markedSpecials = menuFoods.filter((food) => food.isSpecial);
    return (markedSpecials.length ? markedSpecials : menuFoods).slice(0, 6);
  }, [menuFoods]);
  const popular = useMemo(() => menuFoods.slice(0, 20), [menuFoods]);
  const categoryList = useMemo(() => preferredCategories(menuCategories).slice(0, 10), [menuCategories]);

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    navigate(query.trim() ? `/menu?search=${encodeURIComponent(query.trim())}` : "/menu");
  };

  return (
    <main className="bg-savoury-background text-zinc-950 transition-colors dark:bg-[#101010] dark:text-white">
      <section className="relative isolate min-h-[520px] overflow-hidden md:min-h-[580px]">
        <img src={settings.logoUrl} alt="Savoury meals on a restaurant table" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/78 to-savoury-primary/35" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(198,40,40,0.34),transparent_34%)]" />
        <div className="app-container relative flex min-h-[520px] items-center pb-28 pt-14 md:min-h-[580px]">
          <div className="max-w-2xl">
            <motion.span initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-2 text-xs font-black text-zinc-100">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Open Now - {settings.deliveryMin}-{settings.deliveryMax} min delivery
            </motion.span>
            <motion.h1 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.35 }} className="mt-5 font-display text-5xl font-extrabold leading-tight tracking-tight text-white sm:text-6xl lg:text-[64px]">
              {settings.name}
              <span className="block text-savoury-secondary">Fresh Meals</span>
              <span className="block">Delivered Fast.</span>
            </motion.h1>
            <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.35 }} className="mt-5 max-w-xl text-base font-semibold leading-7 text-zinc-300 sm:text-lg">
              Authentic Nigerian cuisine and international favourites, made fresh and delivered to your door.
            </motion.p>
            <motion.form initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.35 }} onSubmit={submitSearch} className="mt-7 flex h-[50px] max-w-[512px] items-center gap-3 rounded-[14px] border-[3px] border-[#765456]/80 bg-white px-4 shadow-[0_10px_28px_rgba(0,0,0,0.22)] dark:bg-[#282c2f]">
              <Search className="h-5 w-5 shrink-0 text-zinc-500 dark:text-zinc-400" />
              <input className="min-w-0 flex-1 bg-transparent text-[15px] font-semibold text-zinc-700 outline-none placeholder:text-zinc-500 dark:text-white dark:placeholder:text-zinc-400" placeholder="Search for meals, categories..." value={query} onChange={(event) => setQuery(event.target.value)} />
            </motion.form>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4, duration: 0.25 }} className="relative z-10 mt-6 flex flex-wrap gap-3">
              <Link to="/menu"><Button className="bg-savoury-secondary text-zinc-950 shadow-none hover:bg-amber-400 hover:shadow-none">Order Now <ArrowRight className="h-4 w-4" /></Button></Link>
              <Link to="/menu"><Button className="border border-white/10 bg-white/10 text-white shadow-none hover:bg-white/15 hover:shadow-none">View Menu</Button></Link>
            </motion.div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 z-0 hidden border-t border-white/10 bg-black/10 backdrop-blur-sm sm:block">
          <div className="app-container grid grid-cols-3 divide-x divide-white/10 py-4">
            <HeroStat icon={Star} label="4.8 Rating" sub="2,000+ reviews" />
            <HeroStat icon={Truck} label="Fast Delivery" sub={`${settings.deliveryMin}-${settings.deliveryMax} minutes`} />
            <HeroStat icon={ShieldCheck} label="Safe & Fresh" sub="Quality guaranteed" />
          </div>
        </div>
      </section>

      <SectionHeader eyebrow="" title="Browse Categories" subtitle="Find exactly what you're craving" action="/menu" actionLabel="All" />
      <section className="app-container pb-9">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 lg:grid-cols-10">
          {categoryList.map((category, index) => <CategoryTile key={category.id} category={category} index={index} />)}
        </div>
      </section>

      <section className="bg-white py-10 dark:bg-[#171717]">
        <SectionHeader eyebrow="Limited Time" title="Today's Specials" subtitle="Chef's picks just for today" action="/menu" />
        <div className="app-container">
          {loadingFoods ? <SkeletonGrid /> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">{specials.map((food, index) => <DarkFoodCard key={food.id} food={food} badge="Special" compact index={index} />)}</div>}
        </div>
      </section>

      <section className="app-container grid gap-4 py-10 md:grid-cols-3">
        {promos.map((promo) => <PromoCard key={promo.title} {...promo} />)}
      </section>

      <section className="app-container py-10">
        <SectionHeader eyebrow="" title="Most Popular" subtitle="Loved by thousands of customers" action="/menu" contained={false} />
        {loadingFoods ? <SkeletonGrid /> : <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{popular.map((food, index) => <DarkFoodCard key={food.id} food={food} badge="Popular" index={index} />)}</div>}
      </section>

      <section className="app-container py-14 text-center">
        <h2 className="text-3xl font-black">Why Choose Savoury?</h2>
        <p className="mt-2 text-sm font-semibold text-zinc-500 dark:text-zinc-500">We go above and beyond to serve you the best</p>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, index) => <FeatureCard key={feature.title} {...feature} index={index} />)}
        </div>
      </section>

      <section className="bg-white py-14 dark:bg-[#171717]">
        <div className="app-container text-center">
          <h2 className="text-3xl font-black">What Customers Say</h2>
          <p className="mt-2 text-sm font-semibold text-zinc-500 dark:text-zinc-500">Over 2,000 five-star reviews and counting</p>
          <div className="mx-auto mt-8 grid max-w-5xl gap-5 md:grid-cols-3">
            {testimonials.map((testimonial, index) => <TestimonialCard key={testimonial.name} {...testimonial} index={index} />)}
          </div>
        </div>
      </section>

      <section className="app-container py-14">
        <div className="relative overflow-hidden rounded-2xl bg-savoury-primary p-8 shadow-premium sm:p-10">
          <img src="/images/savoury-hero.png" alt="" className="absolute inset-y-0 right-0 hidden h-full w-1/2 object-cover opacity-20 md:block" />
          <div className="relative max-w-md">
            <h2 className="text-4xl font-black">Ready to Order?</h2>
            <p className="mt-3 text-sm font-semibold text-white/85">Delivery fee: just {formatCurrency(settings.deliveryFee)}</p>
            <p className="mt-1 text-sm font-bold text-white/75">Min Order: {formatCurrency(1000)}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/menu"><Button className="bg-savoury-secondary text-zinc-950 hover:bg-amber-400">Order Now <ArrowRight className="h-4 w-4" /></Button></Link>
              <Link to="/menu"><Button className="bg-white/12 text-white hover:bg-white/20">Browse Menu</Button></Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function preferredCategories(allCategories: Category[]) {
  const names: Category["name"][] = ["Rice", "Swallow", "Soups", "Grills", "Shawarma", "Pizza", "Burgers", "Drinks", "Smoothies", "Desserts"];
  const byName = new Map(allCategories.map((category) => [category.name, category]));
  return names.map((name) => byName.get(name)).filter(Boolean) as Category[];
}

function SectionHeader({ eyebrow, title, subtitle, action, actionLabel = "View all", contained = true }: { eyebrow: string; title: string; subtitle?: string; action?: string; actionLabel?: string; contained?: boolean }) {
  const content = (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="text-xs font-black uppercase text-savoury-primary">{eyebrow}</p>}
        <h2 className="mt-1 text-2xl font-black tracking-tight">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-500">{subtitle}</p>}
      </div>
      {action && <Link to={action} className="text-xs font-black text-savoury-primary">{actionLabel} <ArrowRight className="inline h-3 w-3" /></Link>}
    </div>
  );
  return contained ? <div className="app-container pt-10">{content}</div> : content;
}

function CategoryTile({ category, index }: { category: Category; index: number }) {
  const Icon = categoryIcons[category.name] || Utensils;
  const tones = [
    "border-orange-500/25 bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-300",
    "border-red-500/25 bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-300",
    "border-pink-500/25 bg-pink-50 text-pink-600 dark:bg-pink-500/10 dark:text-pink-300",
    "border-blue-500/25 bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300",
    "border-emerald-500/25 bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300",
    "border-purple-500/25 bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-300",
  ];
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04, duration: 0.3 }}>
      <Link to={`/menu?category=${encodeURIComponent(category.name)}`} className={`grid min-h-24 place-items-center rounded-xl border p-3 text-center shadow-soft transition duration-200 hover:-translate-y-0.5 hover:shadow-premium ${tones[index % tones.length]}`}>
        <Icon className="h-6 w-6" />
        <span className="mt-2 text-xs font-black text-zinc-950 dark:text-white">{category.name}</span>
      </Link>
    </motion.div>
  );
}

function HeroStat({ icon: Icon, label, sub }: { icon: LucideIcon; label: string; sub: string }) {
  return (
    <div className="flex items-center justify-center gap-3 px-4">
      <span className="grid h-9 w-9 place-items-center rounded-lg bg-white/10 text-savoury-secondary">
        <Icon className="h-4 w-4" />
      </span>
      <span>
        <span className="block text-xs font-black text-white">{label}</span>
        <span className="block text-[11px] font-semibold text-white/50">{sub}</span>
      </span>
    </div>
  );
}

function DarkFoodCard({ food, badge, compact = false, index = 0 }: { food: Food; badge?: string; compact?: boolean; index?: number }) {
  const { addItem } = useCart();
  const { user } = useAuth();
  const [favorite, setFavorite] = useState(false);
  const [imageSrc, setImageSrc] = useState(food.image || "/images/savoury-hero.png");
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
    <motion.article initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05, duration: 0.3 }} className="group overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-premium dark:border-white/5 dark:bg-[#242424]">
      <div className="relative overflow-hidden">
        <Link to={`/food/${food.slug}`} className="block">
          <img src={imageSrc} alt={food.name} loading="lazy" onError={() => setImageSrc("/images/savoury-hero.png")} className={`${compact ? "h-36" : "h-44"} w-full object-cover transition-transform duration-500 ease-out group-hover:scale-110`} />
        </Link>
        {(badge || food.isSpecial) && <span className="absolute left-3 top-3 rounded-full bg-savoury-secondary px-2 py-1 text-[10px] font-black text-zinc-950">{badge || "Special"}</span>}
        <button
          aria-label={`${favorite ? "Remove from" : "Add to"} favorites: ${food.name}`}
          className={`absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-white/90 transition ${favorite ? "text-savoury-primary" : "text-zinc-600 hover:text-savoury-primary"}`}
          onClick={toggleFavorite}
        >
          <Heart className={`h-4 w-4 ${favorite ? "fill-current" : ""}`} />
        </button>
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <Link to={`/food/${food.slug}`} className="line-clamp-1 font-black text-zinc-950 hover:text-savoury-primary dark:text-white dark:hover:text-savoury-secondary">{food.name}</Link>
          <span className="flex items-center gap-1 text-xs font-black text-savoury-secondary"><Star className="h-3 w-3 fill-current" /> {food.rating}</span>
        </div>
        <p className="mt-2 line-clamp-2 min-h-10 text-xs leading-5 text-zinc-600 dark:text-zinc-400">{food.description}</p>
        <div className="mt-3 flex items-center gap-4 text-[11px] font-bold text-zinc-500 dark:text-zinc-500">
          <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {food.prepTime} min</span>
          <span>{food.calories} kcal</span>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <span className="font-black text-savoury-primary">{formatCurrency(food.price)}</span>
          <Button className="h-8 rounded-lg px-3 text-xs" onClick={() => addItem(food)}>
            <ShoppingCart className="h-3 w-3" />
            Add
          </Button>
        </div>
      </div>
    </motion.article>
  );
}

function PromoCard({ title, copy, code, tone, icon: Icon }: { title: string; copy: string; code: string; tone: string; icon: LucideIcon }) {
  return (
    <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }} className={`relative overflow-hidden rounded-xl bg-gradient-to-r ${tone} p-5 shadow-soft`}>
      <Icon className="absolute bottom-3 right-4 h-12 w-12 text-white/15" />
      <h3 className="text-xl font-black text-white">{title}</h3>
      <p className="mt-1 text-sm font-semibold text-white/80">{copy}</p>
      <span className="mt-4 inline-flex rounded-lg bg-white/20 px-3 py-1 text-xs font-black text-white">Code: {code}</span>
    </motion.div>
  );
}

function FeatureCard({ icon: Icon, title, copy, index = 0 }: { icon: LucideIcon; title: string; copy: string; index?: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.1, duration: 0.35 }} className="rounded-xl border border-zinc-200 bg-white p-6 shadow-soft transition hover:-translate-y-1 dark:border-white/5 dark:bg-[#242424]">
      <Icon className="mx-auto h-8 w-8 text-savoury-secondary" />
      <h3 className="mt-4 font-black">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-500">{copy}</p>
    </motion.div>
  );
}

function TestimonialCard({ name, place, text, rating, index = 0 }: { name: string; place: string; text: string; rating: number; index?: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.1, duration: 0.35 }} className="rounded-xl border border-zinc-200 bg-white p-6 text-left shadow-soft dark:border-white/5 dark:bg-[#202020]">
      <div className="flex gap-1 text-savoury-secondary">{Array.from({ length: rating }).map((_, index) => <Star key={index} className="h-4 w-4 fill-current" />)}</div>
      <p className="mt-4 text-sm leading-6 text-zinc-600 dark:text-zinc-400">"{text}"</p>
      <div className="mt-5 flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-full bg-savoury-primary font-black text-white">{name.slice(0, 1)}</span>
        <div><p className="font-black text-zinc-950 dark:text-white">{name}</p><p className="text-xs text-zinc-500">{place}</p></div>
      </div>
    </motion.div>
  );
}

function SkeletonGrid() {
  return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="savoury-skeleton h-72 bg-zinc-200 dark:bg-white/10" />)}</div>;
}
