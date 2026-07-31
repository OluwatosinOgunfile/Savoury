import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "outline" | "dark";
type Size = "sm" | "md" | "lg" | "icon";

const variants: Record<Variant, string> = {
  primary: "bg-savoury-primary text-white shadow-soft hover:bg-red-800",
  secondary: "bg-savoury-secondary text-zinc-950 shadow-soft hover:bg-amber-400",
  ghost: "bg-transparent text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-white/10",
  outline: "border border-zinc-200 bg-white text-zinc-900 hover:border-savoury-primary hover:text-savoury-primary dark:border-white/10 dark:bg-zinc-950 dark:text-white",
  dark: "bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-4 text-sm",
  lg: "h-12 px-5 text-base",
  icon: "h-11 w-11 p-0",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant = "primary", size = "md", ...props }, ref) => (
  <button
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center gap-2 rounded-xl font-bold transition duration-200 disabled:pointer-events-none disabled:opacity-50",
      variants[variant],
      sizes[size],
      className
    )}
    {...props}
  />
));

Button.displayName = "Button";
