import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

function readEnvFile(path) {
  const content = fs.readFileSync(path, "utf8");
  return Object.fromEntries(
    content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => {
        const index = line.indexOf("=");
        const key = line.slice(0, index).trim();
        const value = line
          .slice(index + 1)
          .trim()
          .replace(/^["']|["']$/g, "");
        return [key, value];
      })
  );
}

const env = readEnvFile(".env.local");
const supabaseUrl = env.VITE_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("Missing VITE_SUPABASE_URL and a service-role key in .env.local.");
  console.error("Add SUPABASE_SERVICE_ROLE_KEY from Supabase Project Settings > API > service_role key.");
  console.error("The anon key cannot seed protected tables because row-level security blocks inserts.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const imageUrl = "/images/savoury-hero.png";

const categories = [
  ["Rice", null, "BowlFood", "Comfort rice plates with signature sauces."],
  ["Jollof Rice", "Rice", "Flame", "Smoky party-style jollof."],
  ["Fried Rice", "Rice", "Leaf", "Vegetable fried rice with proteins."],
  ["Native Rice", "Rice", "Soup", "Palm oil rice with seafood notes."],
  ["White Rice", "Rice", "Utensils", "Steamed rice with stew options."],
  ["Swallow", null, "Wheat", "Classic swallow meals with rich soups."],
  ["Pounded Yam", "Swallow", "Wheat", "Smooth yam swallow."],
  ["Eba", "Swallow", "Wheat", "Golden garri swallow."],
  ["Amala", "Swallow", "Wheat", "Soft yam flour swallow."],
  ["Semo", "Swallow", "Wheat", "Silky semolina swallow."],
  ["Fufu", "Swallow", "Wheat", "Soft fermented cassava swallow."],
  ["Soups", null, "Soup", "Deep, hearty Nigerian soups."],
  ["Egusi", "Soups", "Soup", "Melon seed soup."],
  ["Ogbono", "Soups", "Soup", "Draw soup with assorted meats."],
  ["Afang", "Soups", "Leaf", "Leafy seafood-rich soup."],
  ["Vegetable Soup", "Soups", "Leaf", "Fresh greens and proteins."],
  ["Seafood Okra", "Soups", "Fish", "Okra loaded with seafood."],
  ["Pepper Soup", "Soups", "Flame", "Spicy aromatic broth."],
  ["Grills", null, "Flame", "Fire-kissed proteins and sides."],
  ["Chicken", "Grills", "Drumstick", "Grilled and fried chicken."],
  ["Turkey", "Grills", "Drumstick", "Smoked turkey portions."],
  ["Goat Meat", "Grills", "Flame", "Peppered goat meat."],
  ["Fish", "Grills", "Fish", "Whole fish and fillets."],
  ["Suya", "Grills", "Flame", "Spiced skewers."],
  ["Shawarma", null, "Sandwich", "Creamy wraps with grilled fillings."],
  ["Pizza", null, "Pizza", "Crisp crust pizzas."],
  ["Small", "Pizza", "Pizza", "Personal pizzas."],
  ["Medium", "Pizza", "Pizza", "Shareable medium pizzas."],
  ["Large", "Pizza", "Pizza", "Family-size pizzas."],
  ["Burgers", null, "Sandwich", "Stacked gourmet burgers."],
  ["Drinks", null, "CupSoda", "Cold drinks and mocktails."],
  ["Smoothies", null, "CupSoda", "Fresh fruit blends."],
  ["Desserts", null, "CakeSlice", "Sweet finishes."],
];

const foods = [
  ["jollof-feast", "Savoury Jollof Feast", "Jollof Rice", 8500, 32, 690, 4.9, 188, ["smoky jollof", "grilled chicken", "plantain", "pepper sauce"], true, true],
  ["fried-rice-chicken", "Golden Fried Rice Chicken", "Fried Rice", 7800, 27, 640, 4.8, 142, ["fried rice", "chicken", "coleslaw", "chilli oil"], false, true],
  ["native-rice-fish", "Native Rice and Croaker", "Native Rice", 9200, 35, 720, 4.7, 98, ["palm rice", "croaker", "scent leaf", "prawns"], true, false],
  ["white-rice-stew", "White Rice and Beef Stew", "White Rice", 6200, 20, 560, 4.6, 73, ["white rice", "beef stew", "plantain"], false, false],
  ["pounded-yam-egusi", "Pounded Yam with Egusi", "Pounded Yam", 8800, 30, 810, 4.9, 205, ["pounded yam", "egusi", "beef", "stockfish"], true, true],
  ["eba-ogbono", "Eba and Ogbono Bowl", "Eba", 6500, 24, 700, 4.6, 64, ["eba", "ogbono", "assorted meat"], false, false],
  ["amala-vegetable", "Amala Vegetable Deluxe", "Amala", 7200, 25, 690, 4.7, 87, ["amala", "vegetable soup", "turkey"], false, true],
  ["semo-afang", "Semo with Afang", "Semo", 7900, 28, 760, 4.8, 112, ["semo", "afang", "periwinkle", "beef"], true, false],
  ["fufu-seafood-okra", "Fufu Seafood Okra", "Fufu", 9800, 34, 820, 4.8, 129, ["fufu", "okra", "prawns", "fish"], false, true],
  ["pepper-soup-goat", "Goat Meat Pepper Soup", "Pepper Soup", 7000, 22, 480, 4.7, 101, ["goat meat", "pepper soup spice", "yam"], false, false],
  ["grilled-chicken", "Charcoal Grilled Chicken", "Chicken", 7600, 26, 610, 4.8, 166, ["chicken", "suya spice", "herb rice"], true, true],
  ["smoked-turkey", "Smoked Turkey Platter", "Turkey", 8900, 30, 670, 4.7, 82, ["turkey", "chips", "slaw", "pepper sauce"], false, false],
  ["goat-meat-asun", "Peppered Goat Meat Asun", "Goat Meat", 8300, 28, 590, 4.8, 139, ["goat meat", "onions", "scotch bonnet"], true, false],
  ["whole-fish", "Grilled Whole Fish", "Fish", 11000, 38, 740, 4.9, 91, ["tilapia", "plantain", "salad", "sauce"], false, true],
  ["suya-box", "Premium Suya Box", "Suya", 6800, 18, 520, 4.7, 175, ["beef suya", "yaji", "onions", "tomatoes"], false, true],
  ["chicken-shawarma", "Loaded Chicken Shawarma", "Shawarma", 5200, 15, 620, 4.6, 120, ["flatbread", "chicken", "sausages", "garlic cream"], false, false],
  ["small-pizza", "Small Pepperoni Pizza", "Small", 6000, 18, 770, 4.5, 54, ["pepperoni", "mozzarella", "tomato sauce"], false, false],
  ["medium-pizza", "Medium Chicken Suya Pizza", "Medium", 10500, 24, 980, 4.8, 97, ["suya chicken", "mozzarella", "peppers"], true, true],
  ["large-pizza", "Large Family Feast Pizza", "Large", 14500, 30, 1300, 4.7, 88, ["beef", "chicken", "vegetables", "cheese"], false, false],
  ["beef-burger", "Savoury Double Burger", "Burgers", 7400, 17, 850, 4.8, 149, ["beef patties", "cheddar", "pickles", "signature sauce"], true, true],
  ["zobo-drink", "Zobo Citrus Cooler", "Drinks", 2400, 4, 130, 4.6, 62, ["hibiscus", "ginger", "orange", "mint"], false, false],
  ["mango-smoothie", "Mango Passion Smoothie", "Smoothies", 3600, 6, 260, 4.8, 77, ["mango", "passion fruit", "yogurt"], false, true],
  ["chocolate-cake", "Warm Chocolate Cake", "Desserts", 4200, 10, 430, 4.7, 58, ["dark chocolate", "cream", "berries"], false, false],
];

const coupons = [
  { code: "SAVOURY15", discount_type: "percentage", value: 15, min_order: 10000, is_active: true },
  { code: "FAST1000", discount_type: "fixed", value: 1000, min_order: 7000, is_active: true },
  { code: "WELCOME20", discount_type: "percentage", value: 20, min_order: 15000, is_active: true },
];

const reviewSeeds = [
  ["seed-ada@savoury.local", "Ada M.", "jollof-feast", 5, "Smoky, hot, and packaged beautifully. The delivery tracker was accurate.", 24],
  ["seed-tunde@savoury.local", "Tunde A.", "pounded-yam-egusi", 5, "The egusi tasted homemade and the pounded yam texture was perfect.", 18],
  ["seed-maya@savoury.local", "Maya O.", "beef-burger", 4, "Great burger, generous sauce, still warm when it arrived.", 11],
];

async function must(label, promise) {
  const { data, error } = await promise;
  if (error) {
    if (error.message?.includes("schema cache") || error.message?.includes("Could not find the table")) {
      throw new Error(
        `${label}: ${error.message}\n\nThe Supabase schema has not been created in this project yet. Run supabase/schema.sql in the Supabase SQL Editor, then run npm.cmd run seed:supabase again.`
      );
    }
    if (error.message?.includes("row-level security")) {
      throw new Error(
        `${label}: ${error.message}\n\nThe seed is not using a service-role key. Add SUPABASE_SERVICE_ROLE_KEY to .env.local, or run supabase/seed.sql in the Supabase SQL Editor.`
      );
    }
    throw new Error(`${label}: ${error.message}`);
  }
  return data;
}

await must(
  "seed root categories",
  supabase.from("categories").upsert(
    categories.map(([name, _parent, icon, description]) => ({ name, icon, description })),
    { onConflict: "name" }
  )
);

const categoryRows = await must("read categories", supabase.from("categories").select("id,name"));
const categoryByName = new Map(categoryRows.map((category) => [category.name, category.id]));

for (const [name, parentName] of categories) {
  if (!parentName) continue;
  await must(
    `set parent for ${name}`,
    supabase.from("categories").update({ parent_id: categoryByName.get(parentName) }).eq("name", name)
  );
}

await must(
  "seed foods",
  supabase.from("foods").upsert(
    foods.map(([slug, name, category, price, preparation_time, calories, rating, popularity, ingredients, is_special, is_recommended]) => ({
      slug,
      name,
      category_id: categoryByName.get(category),
      description: `Premium ${name} prepared fresh by Savoury's kitchen with balanced seasoning and fast delivery packaging.`,
      price,
      image_url: imageUrl,
      ingredients,
      calories,
      preparation_time,
      rating,
      popularity,
      stock_quantity: 50,
      is_available: true,
      is_special,
      is_recommended,
    })),
    { onConflict: "slug" }
  )
);

await must("seed coupons", supabase.from("coupons").upsert(coupons, { onConflict: "code" }));

const existingSettings = await must(
  "read restaurant settings",
  supabase.from("restaurant_settings").select("id").eq("name", "Savoury").maybeSingle()
);

const settingsPayload = {
  name: "Savoury",
  tagline: "Fresh Meals Delivered Fast.",
  opening_hours: "Open daily, 9:00 AM - 11:00 PM",
  delivery_base_fee: 1200,
  tax_rate: 0.075,
  updated_at: new Date().toISOString(),
};

if (existingSettings?.id) {
  await must("update restaurant settings", supabase.from("restaurant_settings").update(settingsPayload).eq("id", existingSettings.id));
} else {
  await must("seed restaurant settings", supabase.from("restaurant_settings").insert(settingsPayload));
}

const foodRows = await must("read foods", supabase.from("foods").select("id,slug"));
const foodBySlug = new Map(foodRows.map((food) => [food.slug, food.id]));

let reviewCount = 0;
for (const [email, fullName, foodSlug, rating, comment, helpful_count] of reviewSeeds) {
  let userId;
  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email,
    password: "SavourySeed123!",
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (created?.user?.id) {
    userId = created.user.id;
  } else if (createError?.message?.toLowerCase().includes("already")) {
    const users = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
    userId = users.data?.users?.find((user) => user.email === email)?.id;
  } else if (createError) {
    console.log(`reviews: skipped auth user ${email} - ${createError.message}`);
    continue;
  }

  if (!userId) continue;

  await must("upsert public user", supabase.from("users").upsert({ id: userId, email, role: "customer" }, { onConflict: "id" }));
  await must(
    "upsert profile",
    supabase.from("profiles").upsert(
      {
        id: userId,
        full_name: fullName,
        loyalty_points: 250,
        referral_code: fullName.split(" ")[0].toUpperCase().replace(/[^A-Z]/g, "") + "SEED",
      },
      { onConflict: "id" }
    )
  );

  const foodId = foodBySlug.get(foodSlug);
  if (!foodId) continue;

  const existingReview = await must(
    "read review",
    supabase.from("reviews").select("id").eq("user_id", userId).eq("food_id", foodId).maybeSingle()
  );

  const reviewPayload = {
    user_id: userId,
    food_id: foodId,
    rating,
    comment,
    image_url: imageUrl,
    helpful_count,
  };

  if (existingReview?.id) {
    await must("update review", supabase.from("reviews").update(reviewPayload).eq("id", existingReview.id));
  } else {
    await must("insert review", supabase.from("reviews").insert(reviewPayload));
  }
  reviewCount += 1;
}

const counts = {};
for (const table of ["categories", "foods", "coupons", "reviews", "restaurant_settings"]) {
  const { count, error } = await supabase.from(table).select("id", { count: "exact", head: true });
  if (error) throw new Error(`count ${table}: ${error.message}`);
  counts[table] = count ?? 0;
}

console.log(`Seed complete.`);
console.log(`categories: ${counts.categories}`);
console.log(`foods: ${counts.foods}`);
console.log(`coupons: ${counts.coupons}`);
console.log(`reviews touched: ${reviewCount}; total reviews: ${counts.reviews}`);
console.log(`restaurant_settings: ${counts.restaurant_settings}`);
