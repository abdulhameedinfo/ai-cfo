import ChatPanel from "@/components/ChatPanel";
import KpiCard from "@/components/KpiCard";
import OrgSection from "@/components/OrgSection";
import { getDashboardData } from "@/lib/dashboard";
import { formatCurrency, formatPct } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function Home() {
  const data = await getDashboardData();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-900">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-12">
        <section className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-3xl border border-white/10 bg-white/90 p-8 shadow-[0_30px_80px_-50px_rgba(15,23,42,0.8)] backdrop-blur">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
              Robotic Imaging CFO
            </p>
            <h1 className="mt-4 text-4xl font-semibold leading-tight text-slate-900">
              AI CFO Dashboard
            </h1>
            <p className="mt-4 max-w-2xl text-sm text-slate-600">
              Track real-time profitability, monitor cost drivers, and let the AI
              analyst flag margin risks across enterprise retail accounts.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
              <KpiCard
                label="Total Revenue"
                value={formatCurrency(data.kpis.totalRevenue)}
                helper="Rolling 24 months"
              />
              <KpiCard
                label="Total Expenses"
                value={formatCurrency(data.kpis.totalExpenses)}
                helper="Travel + equipment"
              />
              <KpiCard
                label="Net Margin"
                value={formatCurrency(data.kpis.netMargin)}
                helper={`Margin ${formatPct(data.kpis.netMarginPct)}`}
              />
              <KpiCard
                label="Active Projects"
                value={String(data.kpis.activeProjects)}
                helper="Currently in flight"
              />
            </div>
          </div>

          <ChatPanel />
        </section>

        <section className="flex flex-col gap-6">
          {data.organizations.map((org) => (
            <OrgSection key={org.id} org={org} />
          ))}
        </section>
      </main>
    </div>
  );
}
