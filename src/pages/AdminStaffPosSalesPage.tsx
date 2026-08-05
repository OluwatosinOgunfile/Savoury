import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, BadgeDollarSign, ReceiptText, Search, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { fetchAdminSalesRepresentativeActivity } from "@/services/adminDashboardService";
import { formatCurrency } from "@/lib/utils";

export function AdminStaffPosSalesPage() {
  const { repId = "" } = useParams();
  const [query, setQuery] = useState("");
  const [payment, setPayment] = useState("all");
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-sales-representative-activity", repId],
    queryFn: () => fetchAdminSalesRepresentativeActivity(repId),
    enabled: Boolean(repId),
    refetchInterval: 15000,
  });

  const sales = data?.sales || [];
  const paymentMethods = useMemo(() => Array.from(new Set(sales.map((sale) => sale.paymentMethod))).sort(), [sales]);
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return sales.filter((sale) => {
      const matchesSearch = !term || [sale.receiptNumber, sale.customerName || "", sale.orderType, sale.paymentMethod].some((value) => value.toLowerCase().includes(term));
      return matchesSearch && (payment === "all" || sale.paymentMethod === payment);
    });
  }, [payment, query, sales]);

  if (isLoading) return <main className="app-container grid min-h-[60vh] place-items-center"><div className="h-10 w-10 animate-spin rounded-full border-2 border-savoury-primary border-t-transparent" /></main>;
  if (error || !data) return <main className="app-container py-8"><Link to={`/admin/sales-representatives/${repId}`}><Button variant="outline"><ArrowLeft className="h-4 w-4" /> Staff Activity</Button></Link><Card className="mt-5"><CardContent><h1 className="text-xl font-black">POS sales unavailable</h1><p className="mt-2 text-sm font-semibold text-zinc-500">{error instanceof Error ? error.message : "This staff profile could not be found."}</p></CardContent></Card></main>;

  const rep = data.representative;
  const todayStart = new Date().setHours(0, 0, 0, 0);
  const todaySales = sales.filter((sale) => new Date(sale.createdAt).getTime() >= todayStart);

  return (
    <main className="app-container py-6">
      <Link to={`/admin/sales-representatives/${rep.id}`} className="inline-flex items-center gap-2 text-sm font-black text-savoury-primary"><ArrowLeft className="h-4 w-4" /> {rep.fullName}</Link>
      <p className="mt-5 text-xs font-black uppercase tracking-[0.2em] text-savoury-primary">Sales history</p>
      <h1 className="mt-1 text-3xl font-black">All POS Sales</h1>
      <p className="mt-1 text-sm font-semibold text-zinc-500">{rep.fullName} · {rep.staffId} · {rep.email}</p>

      <section className="mt-6 grid gap-3 sm:grid-cols-3">
        <Metric icon={ReceiptText} label="Transactions" value={sales.length.toString()} />
        <Metric icon={BadgeDollarSign} label="Today's revenue" value={formatCurrency(todaySales.reduce((sum, sale) => sum + sale.total, 0))} />
        <Metric icon={ShoppingBag} label="Total revenue" value={formatCurrency(data.totalRevenue)} />
      </section>

      <Card className="mt-5">
        <CardContent>
          <div className="grid gap-3 md:grid-cols-[1fr_240px]">
            <label className="flex h-12 items-center gap-3 rounded-xl border border-zinc-200 bg-white px-4 dark:border-white/10 dark:bg-zinc-950"><Search className="h-4 w-4 text-zinc-400" /><Input className="h-auto border-0 bg-transparent p-0 shadow-none dark:bg-transparent" placeholder="Search receipt or customer" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
            <select className="h-12 rounded-xl border border-zinc-200 bg-white px-4 text-sm font-bold dark:border-white/10 dark:bg-zinc-950" value={payment} onChange={(event) => setPayment(event.target.value)}><option value="all">All payment methods</option>{paymentMethods.map((method) => <option key={method} value={method}>{method}</option>)}</select>
          </div>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="text-xs uppercase text-zinc-400"><tr><th className="py-3">Receipt</th><th>Customer</th><th>Type</th><th>Payment</th><th>Status</th><th>Date</th><th className="text-right">Total</th></tr></thead>
              <tbody>{filtered.map((sale) => <tr key={sale.id} className="border-t border-zinc-100 dark:border-white/10"><td className="py-4 font-black">{sale.receiptNumber}</td><td>{sale.customerName || "Walk-in"}</td><td className="capitalize">{sale.orderType.replace(/_/g, " ")}</td><td className="capitalize">{sale.paymentMethod}</td><td><span className="rounded-full bg-savoury-primary/10 px-2.5 py-1 text-xs font-black capitalize text-savoury-primary">{sale.status}</span></td><td>{new Date(sale.createdAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</td><td className="text-right font-black text-savoury-primary">{formatCurrency(sale.total)}</td></tr>)}</tbody>
            </table>
            {!filtered.length && <div className="mt-3 rounded-xl border border-dashed border-zinc-200 p-8 text-center text-sm font-semibold text-zinc-500 dark:border-white/10">No POS sales match the selected filters.</div>}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof ReceiptText; label: string; value: string }) {
  return <Card><CardContent><Icon className="h-5 w-5 text-savoury-primary" /><p className="mt-3 text-xs font-black uppercase text-zinc-500">{label}</p><p className="mt-1 text-2xl font-black">{value}</p></CardContent></Card>;
}
