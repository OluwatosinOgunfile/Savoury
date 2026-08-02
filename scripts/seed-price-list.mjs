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
        return [line.slice(0, index).trim(), line.slice(index + 1).trim().replace(/^["']|["']$/g, "")];
      })
  );
}

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

const env = readEnvFile(".env.local");
const supabaseUrl = env.VITE_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_SECRET_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("Missing VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.");
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
  ["Rice", null, "BowlFood", "Rice plates with protein options."],
  ["Jollof Rice", "Rice", "Flame", "Jollof rice and fried rice combinations."],
  ["Fried Rice", "Rice", "Leaf", "Chinese, oriental, and mixed fried rice plates."],
  ["Native Rice", "Rice", "Soup", "Native rice plates with protein options."],
  ["White Rice", "Rice", "Utensils", "White rice and beans plates."],
  ["Swallow", null, "Wheat", "Amala, semo, eba, and poundo meals."],
  ["Pounded Yam", "Swallow", "Wheat", "Poundo meals with protein options."],
  ["Eba", "Swallow", "Wheat", "Eba meals with protein options."],
  ["Amala", "Swallow", "Wheat", "Amala meals with protein options."],
  ["Semo", "Swallow", "Wheat", "Semo meals with protein options."],
  ["Soups", null, "Soup", "Soup and pepper soup options."],
  ["Egusi", "Soups", "Soup", "Egusi soup."],
  ["Efo Riro", "Soups", "Leaf", "Efo riro soup."],
  ["Ewedu", "Soups", "Soup", "Ewedu soup."],
  ["Edikang Ikong", "Soups", "Leaf", "Edikang ikong soup."],
  ["Seafood Okra", "Soups", "Fish", "Seafood okra soup."],
  ["Pepper Soup", "Soups", "Flame", "Pepper soup plates."],
  ["Chicken", null, "Drumstick", "Crispy chicken packs and chicken meals."],
  ["Fish", null, "Fish", "Fish and tilapia meals."],
  ["Pasta", null, "Utensils", "Pasta plates with protein options."],
  ["Sides", null, "Utensils", "Fries, plantain, and side dishes."],
  ["Breakfast", null, "CakeSlice", "Pancakes and eggs."],
  ["Extras", null, "Plus", "Sauces, dips, and add-ons."],
  ["Combos", null, "PackagePlus", "Meal boxes and sharing packs."],
  ["Drinks", null, "CupSoda", "Soft drinks, malt, juice, and water."],
];

const foods = [
  ["French Fries Regular", "Sides", 2500],
  ["French Fries Medium", "Sides", 4000],
  ["Plantain Strips Regular", "Sides", 700],
  ["Plantain Strips Large", "Sides", 1700],
  ["Pancakes Regular", "Breakfast", 2500],
  ["Pancakes Medium", "Breakfast", 4500],
  ["Pancakes Large", "Breakfast", 4700],
  ["Scrambled Egg - 2 Eggs", "Breakfast", 1000],
  ["Scrambled Egg - 4 Eggs", "Breakfast", 2500],
  ["Maple Syrup", "Extras", 500],
  ["Signature Dip", "Extras", 500],
  ["Ranch Dip", "Extras", 700],
  ["Ketchup", "Extras", 500],
  ["Egg Add-on", "Extras", 500],
  ["Crispy Chicken and Fries", "Chicken", 8000],
  ["Crispy Chicken and Plantain", "Chicken", 9000],
  ["Loaded Fries", "Combos", 13200],
  ["Date Night Box", "Combos", 15000],
  ["Family Feast", "Combos", 18000],
  ["Crispy Chicken and Fries - Me Pack", "Combos", 10000],
  ["Crispy Chicken and Fries - Me and You Pack", "Combos", 18000],
  ["Native Rice with Beef", "Native Rice", 3000],
  ["Native Rice with Fish", "Native Rice", 3500],
  ["Native Rice with Chicken", "Native Rice", 6500],
  ["Jollof and Fried Rice with Beef", "Jollof Rice", 3000],
  ["Jollof and Fried Rice with Fish", "Jollof Rice", 4000],
  ["Jollof and Fried Rice with Chicken", "Jollof Rice", 5500],
  ["Jollof and Fried Rice with Assorted", "Jollof Rice", 3400],
  ["White Rice and Beans with Beef", "White Rice", 2800],
  ["White Rice and Beans with Fish", "White Rice", 3800],
  ["White Rice and Beans with Chicken", "White Rice", 5300],
  ["White Rice and Beans with Assorted", "White Rice", 3800],
  ["White Rice with Beef", "White Rice", 3000],
  ["White Rice with Fish", "White Rice", 4000],
  ["White Rice with Chicken", "White Rice", 5500],
  ["White Rice with Assorted", "White Rice", 3400],
  ["Amala with Beef", "Amala", 2800],
  ["Amala with Fish", "Amala", 3800],
  ["Amala with Assorted", "Amala", 3800],
  ["Amala with Chicken", "Amala", 5300],
  ["Semo with Beef", "Semo", 2800],
  ["Semo with Fish", "Semo", 3800],
  ["Semo with Assorted", "Semo", 3800],
  ["Semo with Chicken", "Semo", 5300],
  ["Eba with Beef", "Eba", 2800],
  ["Eba with Fish", "Eba", 2800],
  ["Eba with Assorted", "Eba", 3800],
  ["Eba with Chicken", "Eba", 5300],
  ["Poundo with Beef", "Pounded Yam", 3000],
  ["Poundo with Fish", "Pounded Yam", 4000],
  ["Poundo with Chicken", "Pounded Yam", 5500],
  ["Poundo with Assorted", "Pounded Yam", 3000],
  ["Pasta with Beef", "Pasta", 3200],
  ["Pasta with Fish", "Pasta", 4200],
  ["Pasta with Chicken", "Pasta", 5700],
  ["Pasta with Assorted", "Pasta", 3200],
  ["Tilapia Fish Pepper Soup", "Pepper Soup", 9000],
  ["Medium Size Tilapia", "Fish", 8000],
  ["Small Size Tilapia", "Fish", 7000],
  ["Assorted Pepper Soup", "Pepper Soup", 7000],
  ["Small Pepper Soup", "Pepper Soup", 6000],
  ["Chinese Fried Rice with Beef", "Fried Rice", 4200],
  ["Chinese Fried Rice with Fish", "Fried Rice", 5200],
  ["Chinese Fried Rice with Chicken", "Fried Rice", 6700],
  ["Asun Dirty Rice with Beef", "Rice", 4200],
  ["Asun Dirty Rice with Fish", "Rice", 5200],
  ["Asun Dirty Rice with Chicken", "Rice", 6700],
  ["Oriental Fried Rice with Beef", "Fried Rice", 4800],
  ["Oriental Fried Rice with Fish", "Fried Rice", 5800],
  ["Oriental Fried Rice with Chicken", "Fried Rice", 7300],
  ["Coconut Rice with Beef", "Rice", 3600],
  ["Coconut Rice with Fish", "Rice", 4100],
  ["Coconut Rice with Chicken", "Rice", 6100],
  ["Hollandia", "Drinks", 3000],
  ["Active Juice", "Drinks", 2500],
  ["Exotic Juice", "Drinks", 2500],
  ["Can Malt", "Drinks", 800],
  ["Pet Malt", "Drinks", 800],
  ["Salyve", "Drinks", 1800],
  ["Coke", "Drinks", 600],
  ["Fayrouz", "Drinks", 1000],
  ["7Up", "Drinks", 600],
  ["Sprite", "Drinks", 600],
  ["Teem", "Drinks", 600],
  ["Fanta", "Drinks", 600],
  ["Pepsi", "Drinks", 600],
  ["Water", "Drinks", 300],
];

async function must(label, promise) {
  const { data, error } = await promise;
  if (error) {
    console.error(`${label}: ${error.message}`);
    process.exit(1);
  }
  return data;
}

await must(
  "seed categories",
  supabase.from("categories").upsert(
    categories.map(([name, , icon, description]) => ({ name, icon, description })),
    { onConflict: "name" }
  )
);

const categoryRows = await must("read categories", supabase.from("categories").select("id,name"));
const categoryByName = new Map(categoryRows.map((category) => [category.name, category.id]));

for (const [name, parentName] of categories) {
  await must("update category parent", supabase.from("categories").update({ parent_id: parentName ? categoryByName.get(parentName) : null }).eq("name", name));
}

await must("hide existing foods", supabase.from("foods").update({ is_available: false }).neq("slug", "__never__"));

await must(
  "seed handwritten price-list foods",
  supabase.from("foods").upsert(
    foods.map(([name, category, price], index) => ({
      name,
      slug: slugify(name),
      category_id: categoryByName.get(category),
      description: `${name} prepared fresh by Savoury's kitchen from the updated restaurant price list.`,
      price,
      image_url: imageUrl,
      ingredients: [category, "Savoury seasoning"],
      calories: category === "Drinks" ? 120 : category === "Extras" ? 80 : 620,
      preparation_time: category === "Drinks" || category === "Extras" ? 3 : category === "Breakfast" || category === "Sides" ? 12 : 25,
      rating: 4.8,
      popularity: 200 - index,
      is_available: true,
      is_special: index < 8,
      is_recommended: index % 3 === 0,
    })),
    { onConflict: "slug" }
  )
);

const { count, error: countError } = await supabase.from("foods").select("id", { count: "exact", head: true }).eq("is_available", true);
if (countError) {
  console.error(`count foods: ${countError.message}`);
  process.exit(1);
}
console.log(`Seeded ${count ?? foods.length} active food items from the handwritten price list.`);
