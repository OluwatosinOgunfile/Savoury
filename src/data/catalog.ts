import type { Address, Category, Coupon, Food, NotificationItem, Order, Review } from "@/types";

const hero = "/images/savoury-hero.png";

export const categories: Category[] = [
  { id: "rice", name: "Rice", icon: "BowlFood", description: "Comfort rice plates with signature sauces." },
  { id: "jollof-rice", name: "Jollof Rice", parent: "Rice", icon: "Flame", description: "Smoky party-style jollof." },
  { id: "fried-rice", name: "Fried Rice", parent: "Rice", icon: "Leaf", description: "Vegetable fried rice with proteins." },
  { id: "native-rice", name: "Native Rice", parent: "Rice", icon: "Soup", description: "Palm oil rice with seafood notes." },
  { id: "white-rice", name: "White Rice", parent: "Rice", icon: "Utensils", description: "Steamed rice with stew options." },
  { id: "swallow", name: "Swallow", icon: "Wheat", description: "Classic swallow meals with rich soups." },
  { id: "pounded-yam", name: "Pounded Yam", parent: "Swallow", icon: "Wheat", description: "Smooth yam swallow." },
  { id: "eba", name: "Eba", parent: "Swallow", icon: "Wheat", description: "Golden garri swallow." },
  { id: "amala", name: "Amala", parent: "Swallow", icon: "Wheat", description: "Soft yam flour swallow." },
  { id: "semo", name: "Semo", parent: "Swallow", icon: "Wheat", description: "Silky semolina swallow." },
  { id: "fufu", name: "Fufu", parent: "Swallow", icon: "Wheat", description: "Soft fermented cassava swallow." },
  { id: "soups", name: "Soups", icon: "Soup", description: "Deep, hearty Nigerian soups." },
  { id: "egusi", name: "Egusi", parent: "Soups", icon: "Soup", description: "Melon seed soup." },
  { id: "ogbono", name: "Ogbono", parent: "Soups", icon: "Soup", description: "Draw soup with assorted meats." },
  { id: "afang", name: "Afang", parent: "Soups", icon: "Leaf", description: "Leafy seafood-rich soup." },
  { id: "vegetable-soup", name: "Vegetable Soup", parent: "Soups", icon: "Leaf", description: "Fresh greens and proteins." },
  { id: "seafood-okra", name: "Seafood Okra", parent: "Soups", icon: "Fish", description: "Okra loaded with seafood." },
  { id: "pepper-soup", name: "Pepper Soup", parent: "Soups", icon: "Flame", description: "Spicy aromatic broth." },
  { id: "grills", name: "Grills", icon: "Flame", description: "Fire-kissed proteins and sides." },
  { id: "chicken", name: "Chicken", parent: "Grills", icon: "Drumstick", description: "Grilled and fried chicken." },
  { id: "turkey", name: "Turkey", parent: "Grills", icon: "Drumstick", description: "Smoked turkey portions." },
  { id: "goat-meat", name: "Goat Meat", parent: "Grills", icon: "Flame", description: "Peppered goat meat." },
  { id: "fish", name: "Fish", parent: "Grills", icon: "Fish", description: "Whole fish and fillets." },
  { id: "suya", name: "Suya", parent: "Grills", icon: "Flame", description: "Spiced skewers." },
  { id: "shawarma", name: "Shawarma", icon: "Sandwich", description: "Creamy wraps with grilled fillings." },
  { id: "pizza", name: "Pizza", icon: "Pizza", description: "Crisp crust pizzas." },
  { id: "small", name: "Small", parent: "Pizza", icon: "Pizza", description: "Personal pizzas." },
  { id: "medium", name: "Medium", parent: "Pizza", icon: "Pizza", description: "Shareable medium pizzas." },
  { id: "large", name: "Large", parent: "Pizza", icon: "Pizza", description: "Family-size pizzas." },
  { id: "burgers", name: "Burgers", icon: "Sandwich", description: "Stacked gourmet burgers." },
  { id: "drinks", name: "Drinks", icon: "CupSoda", description: "Cold drinks and mocktails." },
  { id: "smoothies", name: "Smoothies", icon: "CupSoda", description: "Fresh fruit blends." },
  { id: "desserts", name: "Desserts", icon: "CakeSlice", description: "Sweet finishes." },
];

export const foods: Food[] = [
  ["jollof-feast", "Savoury Jollof Feast", "Jollof Rice", 8500, 32, 690, 4.9, 188, ["smoky jollof", "grilled chicken", "plantain", "pepper sauce"], true, true, true],
  ["fried-rice-chicken", "Golden Fried Rice Chicken", "Fried Rice", 7800, 27, 640, 4.8, 142, ["fried rice", "chicken", "coleslaw", "chilli oil"], false, true, false],
  ["native-rice-fish", "Native Rice and Croaker", "Native Rice", 9200, 35, 720, 4.7, 98, ["palm rice", "croaker", "scent leaf", "prawns"], true, false, true],
  ["white-rice-stew", "White Rice and Beef Stew", "White Rice", 6200, 20, 560, 4.6, 73, ["white rice", "beef stew", "plantain"], false, false, false],
  ["pounded-yam-egusi", "Pounded Yam with Egusi", "Pounded Yam", 8800, 30, 810, 4.9, 205, ["pounded yam", "egusi", "beef", "stockfish"], true, true, true],
  ["eba-ogbono", "Eba and Ogbono Bowl", "Eba", 6500, 24, 700, 4.6, 64, ["eba", "ogbono", "assorted meat"], false, false, false],
  ["amala-vegetable", "Amala Vegetable Deluxe", "Amala", 7200, 25, 690, 4.7, 87, ["amala", "vegetable soup", "turkey"], false, true, false],
  ["semo-afang", "Semo with Afang", "Semo", 7900, 28, 760, 4.8, 112, ["semo", "afang", "periwinkle", "beef"], true, false, false],
  ["fufu-seafood-okra", "Fufu Seafood Okra", "Fufu", 9800, 34, 820, 4.8, 129, ["fufu", "okra", "prawns", "fish"], false, true, true],
  ["pepper-soup-goat", "Goat Meat Pepper Soup", "Pepper Soup", 7000, 22, 480, 4.7, 101, ["goat meat", "pepper soup spice", "yam"], false, false, true],
  ["grilled-chicken", "Charcoal Grilled Chicken", "Chicken", 7600, 26, 610, 4.8, 166, ["chicken", "suya spice", "herb rice"], true, true, true],
  ["smoked-turkey", "Smoked Turkey Platter", "Turkey", 8900, 30, 670, 4.7, 82, ["turkey", "chips", "slaw", "pepper sauce"], false, false, false],
  ["goat-meat-asun", "Peppered Goat Meat Asun", "Goat Meat", 8300, 28, 590, 4.8, 139, ["goat meat", "onions", "scotch bonnet"], true, false, true],
  ["whole-fish", "Grilled Whole Fish", "Fish", 11000, 38, 740, 4.9, 91, ["tilapia", "plantain", "salad", "sauce"], false, true, false],
  ["suya-box", "Premium Suya Box", "Suya", 6800, 18, 520, 4.7, 175, ["beef suya", "yaji", "onions", "tomatoes"], false, true, true],
  ["chicken-shawarma", "Loaded Chicken Shawarma", "Shawarma", 5200, 15, 620, 4.6, 120, ["flatbread", "chicken", "sausages", "garlic cream"], false, false, false],
  ["small-pizza", "Small Pepperoni Pizza", "Small", 6000, 18, 770, 4.5, 54, ["pepperoni", "mozzarella", "tomato sauce"], false, false, false],
  ["medium-pizza", "Medium Chicken Suya Pizza", "Medium", 10500, 24, 980, 4.8, 97, ["suya chicken", "mozzarella", "peppers"], true, true, true],
  ["large-pizza", "Large Family Feast Pizza", "Large", 14500, 30, 1300, 4.7, 88, ["beef", "chicken", "vegetables", "cheese"], false, false, false],
  ["beef-burger", "Savoury Double Burger", "Burgers", 7400, 17, 850, 4.8, 149, ["beef patties", "cheddar", "pickles", "signature sauce"], true, true, true],
  ["zobo-drink", "Zobo Citrus Cooler", "Drinks", 2400, 4, 130, 4.6, 62, ["hibiscus", "ginger", "orange", "mint"], false, false, false],
  ["mango-smoothie", "Mango Passion Smoothie", "Smoothies", 3600, 6, 260, 4.8, 77, ["mango", "passion fruit", "yogurt"], false, true, false],
  ["chocolate-cake", "Warm Chocolate Cake", "Desserts", 4200, 10, 430, 4.7, 58, ["dark chocolate", "cream", "berries"], false, false, true],
].map(([id, name, category, price, prepTime, calories, rating, reviews, ingredients, isSpecial, isRecommended, isTrending]) => ({
  id: id as string,
  name: name as string,
  slug: id as string,
  category: category as Food["category"],
  description: `Premium ${name} prepared fresh by Savoury's kitchen with balanced seasoning and fast delivery packaging.`,
  price: price as number,
  image: hero,
  ingredients: ingredients as string[],
  calories: calories as number,
  prepTime: prepTime as number,
  rating: rating as number,
  reviews: reviews as number,
  popularity: reviews as number,
  tags: [category as string, (isTrending ? "Trending" : "Fresh")],
  isSpecial: Boolean(isSpecial),
  isRecommended: Boolean(isRecommended),
  isTrending: Boolean(isTrending),
  isNew: (reviews as number) < 70,
}));

export const reviews: Review[] = [
  { id: "r1", foodId: "jollof-feast", user: "Ada M.", rating: 5, comment: "Smoky, hot, and packaged beautifully. The delivery tracker was accurate.", image: hero, helpful: 24, createdAt: "2026-07-10" },
  { id: "r2", foodId: "pounded-yam-egusi", user: "Tunde A.", rating: 5, comment: "The egusi tasted homemade and the pounded yam texture was perfect.", helpful: 18, createdAt: "2026-07-11" },
  { id: "r3", foodId: "beef-burger", user: "Maya O.", rating: 4, comment: "Great burger, generous sauce, still warm when it arrived.", helpful: 11, createdAt: "2026-07-12" },
];

export const coupons: Coupon[] = [
  { code: "SAVOURY15", label: "15% off orders above ₦10,000", discountType: "percentage", value: 15, minOrder: 10000 },
  { code: "FAST1000", label: "₦1,000 off fast lunch", discountType: "fixed", value: 1000, minOrder: 7000 },
];

export const addresses: Address[] = [
  { id: "home", label: "Home", line1: "24 Admiralty Way, Lekki Phase 1", city: "Lagos", distanceKm: 4.2, default: true },
  { id: "office", label: "Office", line1: "12 Marina Road, Victoria Island", city: "Lagos", distanceKm: 6.8 },
];

export const notifications: NotificationItem[] = [
  { id: "n1", title: "Order received", body: "Your Savoury kitchen ticket is open.", read: false, createdAt: "2026-07-14T12:10:00Z" },
  { id: "n2", title: "Food is ready", body: "Your last order was dispatched right on time.", read: true, createdAt: "2026-07-13T18:20:00Z" },
];

export const mockOrders: Order[] = [
  { id: "SV-1028", customerName: "Ada M.", phone: "+234 801 000 2000", address: addresses[0].line1, items: [{ food: foods[0], quantity: 2 }, { food: foods[20], quantity: 2 }], status: "preparing", paymentMethod: "card", deliveryMode: "delivery", total: 21800, createdAt: "2026-07-14T12:34:00Z" },
  { id: "SV-1027", customerName: "Tunde A.", phone: "+234 802 111 3000", address: addresses[1].line1, items: [{ food: foods[4], quantity: 1 }], status: "ready", paymentMethod: "transfer", deliveryMode: "pickup", total: 8800, createdAt: "2026-07-14T11:08:00Z" },
];

export const restaurantSettings = {
  name: "Savoury",
  tagline: "Fresh Meals Delivered Fast.",
  rating: 4.8,
  reviews: 2400,
  openingHours: "Open daily, 9:00 AM - 11:00 PM",
  deliveryInfo: "25-40 min delivery across Lagos. Free pickup is available.",
  referralCode: "SAVOURY-FRIEND",
  loyaltyRate: 1,
};
