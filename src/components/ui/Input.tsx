import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "h-12 w-full rounded-xl border border-zinc-200 bg-white px-4 text-sm text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-savoury-primary focus:ring-4 focus:ring-savoury-primary/10 dark:border-white/10 dark:bg-[#101010] dark:text-white dark:placeholder:text-zinc-500",
      className
    )}
    {...props}
  />
));

Input.displayName = "Input";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-savoury-primary focus:ring-4 focus:ring-savoury-primary/10 dark:border-white/10 dark:bg-[#101010] dark:text-white dark:placeholder:text-zinc-500",
      className
    )}
    {...props}
  />
));

Textarea.displayName = "Textarea";
