import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "h-12 w-full rounded-xl border border-white/10 bg-[#101010] px-4 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-savoury-primary focus:ring-4 focus:ring-[#1f2a12]",
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
      "w-full rounded-xl border border-white/10 bg-[#101010] px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-savoury-primary focus:ring-4 focus:ring-[#1f2a12]",
      className
    )}
    {...props}
  />
));

Textarea.displayName = "Textarea";
