export function TermsPage() {
  return (
    <main className="app-container py-12 text-white">
      <div className="mx-auto max-w-3xl">
        <p className="font-black uppercase text-savoury-primary">Terms</p>
        <h1 className="section-title">Terms of Service</h1>
        <div className="mt-6 space-y-5 rounded-2xl border border-white/10 bg-[#1d1d1d] p-6 text-sm leading-7 text-zinc-300 shadow-soft">
          <p>Orders placed through Savoury are confirmed after checkout and may be prepared for delivery or pickup based on the option selected by the customer.</p>
          <p>Prices, delivery fees, taxes, coupon discounts, and estimated delivery times are shown before placing an order. Restaurant staff may accept, reject, or update orders from the admin dashboard.</p>
          <p>Customers are responsible for providing accurate delivery details and reachable phone numbers so orders can be completed smoothly.</p>
        </div>
      </div>
    </main>
  );
}
