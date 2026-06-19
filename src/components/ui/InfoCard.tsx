interface MetricCardProps {
  label: string;
  value: string;
  highlight?: boolean;
}

export function MetricCard({ label, value, highlight }: MetricCardProps) {
  return (
    <div
      className={`card-premium p-5 sm:p-6 ${
        highlight ? "border-navy/20 bg-navy-light/40" : ""
      }`}
    >
      <p className="text-sm font-medium text-slate-600">{label}</p>
      <p className="mt-2 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
        {value}
      </p>
    </div>
  );
}

interface KpiCardProps {
  label: string;
  value: string;
  unit?: string;
  emphasis?: boolean;
}

export function KpiCard({ label, value, unit, emphasis = false }: KpiCardProps) {
  return (
    <div
      className={`flex flex-col items-center px-2.5 py-4 text-center sm:px-3 sm:py-5 ${
        emphasis ? "bg-navy-light/40" : ""
      }`}
    >
      <p className="text-xs font-bold text-slate-500 sm:text-sm">{label}</p>
      <p className={`mt-1.5 font-bold tracking-tight ${emphasis ? "text-xl text-navy sm:text-2xl" : "text-lg text-slate-900 sm:text-xl"}`}>
        {value}
      </p>
      {unit && <p className="mt-0.5 text-xs text-slate-500">{unit}</p>}
    </div>
  );
}
