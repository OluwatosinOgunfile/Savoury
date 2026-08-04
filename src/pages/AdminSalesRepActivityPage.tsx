import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, BadgeDollarSign, Clock3, LogIn, ReceiptText, ShieldCheck, UserRound } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { fetchAdminSalesRepresentativeActivity } from "@/services/adminDashboardService";
import { formatCurrency } from "@/lib/utils";

export function AdminSalesRepActivityPage() {
  const { repId = "" } = useParams();
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-sales-representative-activity", repId],
    queryFn: () => fetchAdminSalesRepresentativeActivity(repId),
    enabled: Boolean(repId),
    refetchInterval: 30000,
  });

  if (isLoading) return <main className="app-container grid min-h-[60vh] place-items-center"><div className="h-10 w-10 animate-spin rounded-full border-2 border-savoury-primary border-t-transparent" /></main>;

  if (error || !data) {
    return (
      <main className="app-container py-8">
        <Link to="/admin"><Button variant="outline"><ArrowLeft className="h-4 w-4" /> Dashboard</Button></Link>
        <Card className="mt-5"><CardContent><h1 className="text-xl font-black">Sales Representative unavailable</h1><p className="mt-2 text-sm font-semibold text-zinc-500">{error instanceof Error ? error.message : "This staff profile could not be found."}</p></CardContent></Card>
      </main>
    );
  }

  const rep = data.representative;
  return (
    <main className="app-container py-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <Link to="/admin" className="inline-flex items-center gap-2 text-sm font-black text-savoury-primary"><ArrowLeft className="h-4 w-4" /> Admin Dashboard</Link>
          <p className="mt-5 text-xs font-black uppercase tracking-[0.2em] text-savoury-primary">Staff activity</p>
          <h1 className="mt-1 text-3xl font-black">{rep.fullName}</h1>
          <p className="mt-1 text-sm font-semibold text-zinc-500">{rep.staffId} · {rep.email}</p>
        </div>
        <span className={`w-fit rounded-full px-4 py-2 text-sm font-black capitalize ${rep.status === "active" ? "bg-savoury-primary/10 text-savoury-primary" : "bg-red-500/10 text-red-500"}`}>{rep.status}</span>
      </div>

      <section className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={ReceiptText} label="Transactions" value={data.sales.length.toString()} />
        <Metric icon={BadgeDollarSign} label="Today's revenue" value={formatCurrency(data.todayRevenue)} />
        <Metric icon={BadgeDollarSign} label="Total revenue" value={formatCurrency(data.totalRevenue)} />
        <Metric icon={ReceiptText} label="Average sale" value={formatCurrency(data.averageSale)} />
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
        <div className="grid gap-5">
          <Card>
            <CardContent>
              <div className="flex items-center gap-3"><UserRound className="h-5 w-5 text-savoury-primary" /><h2 className="text-lg font-black">Staff account</h2></div>
              <div className="mt-4 grid gap-3 text-sm">
                <Detail label="Phone" value={rep.phone || "Not provided"} />
                <Detail label="Created" value={formatDate(rep.createdAt)} />
                <Detail label="Last login" value={rep.lastLoginAt ? formatDate(rep.lastLoginAt) : "No login recorded yet"} />
                <Detail label="Permissions" value={rep.permissions.join(", ") || "POS only"} />
                <Detail label="Password state" value={rep.mustChangePassword ? "Change required" : "Private password set"} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <div className="flex items-center gap-3"><Clock3 className="h-5 w-5 text-savoury-primary" /><h2 className="text-lg font-black">Activity timeline</h2></div>
              <div className="mt-4 grid gap-3">
                {data.events.map((event) => (
                  <div key={event.id} className="flex gap-3 rounded-xl bg-zinc-50 p-3 dark:bg-white/5">
                    <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-savoury-primary/10 text-savoury-primary">{event.action === "signed_in" ? <LogIn className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}</span>
                    <div><p className="text-sm font-black capitalize">{event.action.replace(/_/g, " ")}</p>{event.details && <p className="text-xs font-semibold text-zinc-500">{event.details}</p>}<p className="mt-1 text-xs text-zinc-400">{formatDate(event.createdAt)}</p></div>
                  </div>
                ))}
                {!data.events.length && <Empty text="No tracked activity yet. New sign-ins and completed sales will appear here." />}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent>
            <div className="flex items-center gap-3"><ReceiptText className="h-5 w-5 text-savoury-primary" /><h2 className="text-lg font-black">POS sales</h2></div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[620px] text-left text-sm">
                <thead className="text-xs uppercase text-zinc-400"><tr><th className="py-3">Receipt</th><th>Customer</th><th>Type</th><th>Payment</th><th>Date</th><th className="text-right">Total</th></tr></thead>
                <tbody>
                  {data.sales.map((sale) => (
                    <tr key={sale.id} className="border-t border-zinc-100 dark:border-white/10">
                      <td className="py-4 font-black">{sale.receiptNumber}<p className="text-xs capitalize text-zinc-500">{sale.status}</p></td>
                      <td>{sale.customerName || "Walk-in"}</td><td className="capitalize">{sale.orderType.replace(/_/g, " ")}</td><td className="capitalize">{sale.paymentMethod}</td><td>{formatDate(sale.createdAt)}</td><td className="text-right font-black text-savoury-primary">{formatCurrency(sale.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!data.sales.length && <Empty text="No POS sales have been completed by this staff member." />}
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof ReceiptText; label: string; value: string }) {
  return <Card><CardContent><Icon className="h-5 w-5 text-savoury-primary" /><p className="mt-3 text-xs font-black uppercase text-zinc-500">{label}</p><p className="mt-1 text-2xl font-black">{value}</p></CardContent></Card>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="flex items-start justify-between gap-4 border-b border-zinc-100 pb-3 last:border-0 last:pb-0 dark:border-white/10"><span className="font-semibold text-zinc-500">{label}</span><span className="text-right font-black capitalize">{value}</span></div>;
}

function Empty({ text }: { text: string }) {
  return <div className="mt-3 rounded-xl border border-dashed border-zinc-200 p-5 text-center text-sm font-semibold text-zinc-500 dark:border-white/10">{text}</div>;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}
