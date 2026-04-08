import { formatCurrency, formatCurrencyPrecise, formatPct } from "@/lib/format";
import type { DashboardOrg } from "@/lib/dashboard";

type OrgSectionProps = {
  org: DashboardOrg;
};

export default function OrgSection({ org }: OrgSectionProps) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/70 p-6 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.6)] backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
            Organization
          </p>
          <h3 className="mt-2 text-2xl font-semibold text-slate-900">
            {org.name}
          </h3>
        </div>
        <div className="flex gap-6 text-sm text-slate-600">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
              Revenue
            </p>
            <p className="mt-1 font-semibold text-slate-900">
              {formatCurrency(org.totalRevenue)}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
              Expenses
            </p>
            <p className="mt-1 font-semibold text-slate-900">
              {formatCurrency(org.totalExpenses)}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
              Margin
            </p>
            <p className="mt-1 font-semibold text-emerald-700">
              {formatCurrency(org.margin)} ({formatPct(org.marginPct)})
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase tracking-[0.2em] text-slate-400">
            <tr>
              <th className="pb-3">Project</th>
              <th className="pb-3">Budget</th>
              <th className="pb-3">Revenue</th>
              <th className="pb-3">Expenses</th>
              <th className="pb-3">Margin</th>
              <th className="pb-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {org.projects.map((project) => (
              <tr key={project.id} className="text-slate-700">
                <td className="py-3 pr-4">
                  <p className="font-medium text-slate-900">{project.name}</p>
                  {project.startDate && (
                    <p className="text-xs text-slate-400">
                      Start: {project.startDate}
                    </p>
                  )}
                </td>
                <td className="py-3">{formatCurrency(project.budget)}</td>
                <td className="py-3">
                  {formatCurrencyPrecise(project.totalRevenue)}
                </td>
                <td className="py-3">
                  {formatCurrencyPrecise(project.totalExpenses)}
                </td>
                <td className="py-3 text-emerald-700">
                  {formatCurrencyPrecise(project.margin)} (
                  {formatPct(project.marginPct)})
                </td>
                <td className="py-3 capitalize">{project.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
