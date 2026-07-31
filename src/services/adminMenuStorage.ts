import type { Food } from "@/types";

const adminFoodsKey = "savoury-admin-foods";

export function getStoredAdminFoods(): Food[] {
  try {
    return JSON.parse(localStorage.getItem(adminFoodsKey) || "[]") as Food[];
  } catch {
    return [];
  }
}

export function mergeAdminFoods(baseFoods: Food[]) {
  const storedFoods = getStoredAdminFoods();
  const storedIds = new Set(storedFoods.map((food) => food.id));
  return [...storedFoods, ...baseFoods.filter((food) => !storedIds.has(food.id))];
}

export function saveAdminFood(food: Food) {
  const current = getStoredAdminFoods();
  const next = current.some((item) => item.id === food.id)
    ? current.map((item) => (item.id === food.id ? food : item))
    : [food, ...current];
  localStorage.setItem(adminFoodsKey, JSON.stringify(next));
}

export function deleteAdminFood(foodId: string) {
  const next = getStoredAdminFoods().filter((food) => food.id !== foodId);
  localStorage.setItem(adminFoodsKey, JSON.stringify(next));
}
