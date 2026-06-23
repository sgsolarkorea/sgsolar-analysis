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
      className={`flex flex-col items-center px-2 py-3 text-center sm:px-2.5 sm:py-3.5 ${
        emphasis ? "bg-navy-light/40" : ""
      }`}
    >
      <p className="text-[11px] font-semibold text-slate-500 sm:text-xs">{label}</p>
      <p
        className={`mt-1 font-bold leading-tight tracking-tight ${
          emphasis ? "text-base text-navy sm:text-lg" : "text-sm text-slate-900 sm:text-base"
        }`}
      >
        {value}
      </p>
      {unit && <p className="mt-0.5 text-[11px] text-slate-500">{unit}</p>}
    </div>
  );
}
