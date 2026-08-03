export type UserRole = "customer" | "admin" | "restaurant_staff";
export type StaffRole = "admin" | "manager" | "kitchen" | "delivery" | "staff" | "cashier";

export type FoodCategory =
  | "Rice"
  | "Jollof Rice"
  | "Fried Rice"
  | "Native Rice"
  | "White Rice"
  | "Swallow"
  | "Pounded Yam"
  | "Eba"
  | "Amala"
  | "Semo"
  | "Fufu"
  | "Soups"
  | "Egusi"
  | "Ogbono"
  | "Afang"
  | "Vegetable Soup"
  | "Seafood Okra"
  | "Pepper Soup"
  | "Grills"
  | "Chicken"
  | "Turkey"
  | "Goat Meat"
  | "Fish"
  | "Suya"
  | "Shawarma"
  | "Pizza"
  | "Small"
  | "Medium"
  | "Large"
  | "Burgers"
  | "Pasta"
  | "Sides"
  | "Breakfast"
  | "Extras"
  | "Combos"
  | "Drinks"
  | "Smoothies"
  | "Desserts"
  | "Efo Riro"
  | "Ewedu"
  | "Edikang Ikong";

export interface Category {
  id: string;
  name: FoodCategory;
  parent?: FoodCategory;
  icon: string;
  description: string;
}

export interface Review {
  id: string;
  foodId: string;
  user: string;
  rating: number;
  comment: string;
  image?: string;
  helpful: number;
  createdAt: string;
}

export interface Food {
  id: string;
  name: string;
  slug: string;
  category: FoodCategory;
  description: string;
  price: number;
  image: string;
  ingredients: string[];
  calories: number;
  prepTime: number;
  rating: number;
  reviews: number;
  popularity: number;
  tags: string[];
  isSpecial?: boolean;
  isRecommended?: boolean;
  isTrending?: boolean;
  isNew?: boolean;
  stockQuantity?: number;
}

export interface CartItem {
  food: Food;
  quantity: number;
}

export interface Coupon {
  code: string;
  label: string;
  discountType: "percentage" | "fixed";
  value: number;
  minOrder: number;
}

export interface Address {
  id: string;
  label: string;
  line1: string;
  city: string;
  distanceKm: number;
  default?: boolean;
}

export type PaymentMethod = "cash" | "card" | "transfer";
export type DeliveryMode = "delivery" | "pickup" | "dining";
export type OrderStatus = "preparing" | "ready" | "out_for_delivery" | "delivered";

export interface Order {
  id: string;
  customerName: string;
  phone: string;
  address: string;
  items: CartItem[];
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  deliveryMode: DeliveryMode;
  total: number;
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}
