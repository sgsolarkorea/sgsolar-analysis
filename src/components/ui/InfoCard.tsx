import type { ReactNode } from "react";

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
      className={`flex flex-col items-center px-1.5 py-2 text-center sm:px-2 sm:py-2.5 ${
        emphasis ? "bg-navy-light/40" : ""
      }`}
    >
      <p className="text-[10px] font-semibold text-slate-500 sm:text-[11px]">{label}</p>
      <p
        className={`mt-0.5 font-bold leading-tight tracking-tight ${
          emphasis ? "text-sm text-navy sm:text-base" : "text-xs text-slate-900 sm:text-sm"
        }`}
      >
        {value}
      </p>
      {unit && <p className="mt-px text-[10px] text-slate-500">{unit}</p>}
    </div>
  );
}

interface PremiumOverviewKpiCardProps {
  label: string;
  value: string;
  icon: ReactNode;
}

export function PremiumOverviewKpiCard({ label, value, icon }: PremiumOverviewKpiCardProps) {
  return (
    <div className="group flex min-h-[8.5rem] flex-col rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-50 to-blue-50 text-[#1E3A8A] ring-1 ring-sky-100 transition group-hover:from-sky-100 group-hover:to-blue-100">
        {icon}
      </div>
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className="mt-1.5 text-lg font-bold leading-tight tracking-tight text-[#0B1F3A] sm:text-xl">
        {value}
      </p>
    </div>
  );
}
