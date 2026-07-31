import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { coupons } from "@/data/catalog";
import type { CartItem, Coupon, Food } from "@/types";

interface CartContextValue {
  items: CartItem[];
  coupon?: Coupon;
  addItem: (food: Food, quantity?: number) => void;
  removeItem: (foodId: string) => void;
  setQuantity: (foodId: string, quantity: number) => void;
  applyCoupon: (code: string) => boolean;
  clearCart: () => void;
  subtotal: number;
  deliveryFee: number;
  tax: number;
  discount: number;
  total: number;
  itemCount: number;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [coupon, setCoupon] = useState<Coupon | undefined>();

  const addItem = (food: Food, quantity = 1) => {
    setItems((current) => {
      const existing = current.find((item) => item.food.id === food.id);
      if (existing) {
        return current.map((item) => (item.food.id === food.id ? { ...item, quantity: item.quantity + quantity } : item));
      }
      return [...current, { food, quantity }];
    });
  };

  const removeItem = (foodId: string) => setItems((current) => current.filter((item) => item.food.id !== foodId));
  const setQuantity = (foodId: string, quantity: number) => {
    if (quantity <= 0) return removeItem(foodId);
    setItems((current) => current.map((item) => (item.food.id === foodId ? { ...item, quantity } : item)));
  };

  const clearCart = () => {
    setItems([]);
    setCoupon(undefined);
  };

  const subtotal = items.reduce((sum, item) => sum + item.food.price * item.quantity, 0);
  const deliveryFee = subtotal > 0 ? Math.max(1200, Math.round(subtotal * 0.05)) : 0;
  const tax = Math.round(subtotal * 0.075);
  const discount = coupon && subtotal >= coupon.minOrder ? coupon.discountType === "percentage" ? Math.round(subtotal * (coupon.value / 100)) : coupon.value : 0;
  const total = Math.max(0, subtotal + deliveryFee + tax - discount);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const applyCoupon = (code: string) => {
    const found = coupons.find((entry) => entry.code.toLowerCase() === code.trim().toLowerCase());
    if (!found || subtotal < found.minOrder) return false;
    setCoupon(found);
    return true;
  };

  const value = useMemo(
    () => ({ items, coupon, addItem, removeItem, setQuantity, applyCoupon, clearCart, subtotal, deliveryFee, tax, discount, total, itemCount }),
    [items, coupon, subtotal, deliveryFee, tax, discount, total, itemCount]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside CartProvider");
  return context;
}
