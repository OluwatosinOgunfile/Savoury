export function PageLoader({ compact = false }: { compact?: boolean }) {
  return (
    <main className={`grid place-items-center bg-savoury-background dark:bg-[#101010] ${compact ? "min-h-[60vh]" : "min-h-screen"}`} role="status" aria-label="Loading page">
      <div className="relative grid h-24 w-24 place-items-center">
        <span className="absolute inset-0 rounded-full border border-savoury-primary/20" />
        <span className="savoury-loader-ring absolute inset-1 rounded-full border-2 border-transparent border-t-savoury-primary border-r-savoury-secondary" />
        <span className="savoury-loader-logo block h-16 w-16 overflow-hidden rounded-full bg-white shadow-soft">
          <img src="/images/savoury-logo-tight.jpeg" alt="" className="h-full w-full scale-[1.2] object-cover object-center" />
        </span>
      </div>
      <span className="sr-only">Loading Savoury</span>
    </main>
  );
}
