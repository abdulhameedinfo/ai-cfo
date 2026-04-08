type KpiCardProps = {
  label: string;
  value: string;
  helper?: string;
};

export default function KpiCard({ label, value, helper }: KpiCardProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/70 p-5 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.7)] backdrop-blur">
      <p className="text-xs uppercase tracking-[0.25em] text-slate-400">
        {label}
      </p>
      <p className="mt-3 text-3xl font-semibold text-slate-900">{value}</p>
      {helper && <p className="mt-2 text-sm text-slate-500">{helper}</p>}
    </div>
  );
}
