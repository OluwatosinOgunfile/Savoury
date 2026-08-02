import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

function readEnvFile(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
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

function hashString(value) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

const searchKeywordsByCategory = {
  "Jollof Rice": "jollof,rice,nigerian,food",
  "Fried Rice": "fried,rice,food",
  "Native Rice": "rice,african,food",
  "White Rice": "rice,beans,food",
  Rice: "rice,food,plate",
  Amala: "african,swallow,soup,food",
  Semo: "african,swallow,soup,food",
  Eba: "african,swallow,soup,food",
  "Pounded Yam": "pounded,yam,soup,african,food",
  "Pepper Soup": "pepper,soup,food",
  Fish: "grilled,fish,food",
  Chicken: "fried,chicken,fries,food",
  Pasta: "pasta,food",
  Sides: "fries,plantain,food",
  Breakfast: "pancakes,eggs,breakfast",
  Extras: "sauce,dip,food",
  Combos: "chicken,fries,meal,food",
  Drinks: "soft,drink,juice",
};

function remoteImageUrl(food) {
  const category = food.categories?.name || "food";
  const itemName = food.name.toLowerCase();
  let keywords = searchKeywordsByCategory[category] || "restaurant,food";

  if (itemName.includes("fries")) keywords = "french,fries,food";
  if (itemName.includes("plantain")) keywords = "fried,plantain,food";
  if (itemName.includes("pancake")) keywords = "pancakes,breakfast";
  if (itemName.includes("egg")) keywords = "scrambled,eggs,breakfast";
  if (itemName.includes("tilapia") || itemName.includes("fish")) keywords = "grilled,fish,food";
  if (itemName.includes("chicken")) keywords = "fried,chicken,food";
  if (itemName.includes("malt") || itemName.includes("coke") || itemName.includes("pepsi") || itemName.includes("water") || itemName.includes("juice") || itemName.includes("sprite") || itemName.includes("fanta") || itemName.includes("7up")) keywords = "cold,drink,beverage";

  const lock = 1000 + (hashString(`${food.slug}-${category}`) % 900000);
  return `https://loremflickr.com/900/620/${encodeURIComponent(keywords)}?lock=${lock}`;
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

const { data: foods, error } = await supabase
  .from("foods")
  .select("id, name, slug, categories(name)")
  .eq("is_available", true)
  .order("name");

if (error) {
  console.error(`load foods: ${error.message}`);
  process.exit(1);
}

for (const food of foods) {
  const imageUrl = remoteImageUrl(food);
  const { error: updateError } = await supabase.from("foods").update({ image_url: imageUrl }).eq("id", food.id);
  if (updateError) {
    console.error(`update ${food.name}: ${updateError.message}`);
    process.exit(1);
  }
}

console.log(`Linked ${foods.length} active menu items to remote food-photo URLs.`);
