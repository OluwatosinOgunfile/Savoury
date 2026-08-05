export function PrivacyPage() {
  return (
    <main className="app-container py-12 text-zinc-950 dark:text-white">
      <div className="mx-auto max-w-3xl">
        <p className="font-black uppercase text-savoury-primary">Privacy</p>
        <h1 className="section-title">Privacy Policy</h1>
        <div className="mt-6 space-y-5 rounded-2xl border border-zinc-200 bg-white p-6 text-sm leading-7 text-zinc-700 shadow-soft dark:border-white/10 dark:bg-[#1d1d1d] dark:text-zinc-300">
          <p>Savoury uses your account, address, order, and payment preference information to prepare meals, deliver orders, send order updates, and improve the ordering experience.</p>
          <p>Authentication is handled through Supabase, including email login and Google sign-in. Payment integrations are structured for secure providers such as Paystack, Flutterwave, and Stripe.</p>
          <p>You can update saved addresses, profile details, notification preferences, and order information from your account area.</p>
        </div>
      </div>
    </main>
  );
}
