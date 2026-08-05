import { cn } from "@/lib/utils";

export function Logo({ inverse = false }: { inverse?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="grid h-16 w-16 place-items-center overflow-hidden rounded-full bg-white shadow-soft ring-1 ring-zinc-200 dark:ring-white/10">
        <img src="/images/savoury-logo-tight.jpeg" alt="Savoury logo" className="h-full w-full scale-[1.2] object-cover object-center" />
      </div>
      <div>
        <p className={cn("text-lg font-black leading-none", inverse ? "text-white" : "text-zinc-950 dark:text-white")}>Savoury</p>
        <p className={cn("text-xs font-bold", inverse ? "text-zinc-400" : "text-zinc-500")}>Fresh Meals Delivered Fast.</p>
      </div>
    </div>
  );
}
