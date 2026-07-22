interface KeyMetricCardProps {
  label: string;
  value: string;
  unit?: string;
  icon: React.ReactNode;
  accent: string;
}

function KeyMetricCard({ label, value, unit, icon, accent }: KeyMetricCardProps) {
  const unavailable = value === "산정 불가" || value === "현장 확인 필요";

  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className={`absolute inset-x-0 top-0 h-1 ${accent}`} aria-hidden />
      <div className="flex items-start justify-between gap-3">
        <p className="text-[13px] font-medium text-slate-500 sm:text-sm">{label}</p>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-navy">
          {icon}
        </span>
      </div>
      <p
        className={`mt-3 text-[26px] font-bold leading-tight tracking-tight sm:text-[30px] ${
          unavailable ? "text-slate-400" : "text-navy"
        }`}
      >
        {value}
        {unit && !unavailable ? (
          <span className="ml-1 text-base font-semibold text-slate-500 sm:text-lg">{unit}</span>
        ) : null}
      </p>
    </div>
  );
}

interface KeyMetricCardsProps {
  capacity: string;
  annualGeneration: string;
  annualRevenue: string;
  installType: string;
  analysisArea?: string;
}

export function KeyMetricCards({
  capacity,
  annualGeneration,
  annualRevenue,
  installType,
  analysisArea,
}: KeyMetricCardsProps) {
  const metrics = [
    {
      label: "예상 설치용량",
      value: capacity || "산정 불가",
      accent: "bg-amber-400",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 3v2m0 14v2m9-9h-2M5 12H3m15.364 6.364l-1.414-1.414M7.05 7.05L5.636 5.636m12.728 0l-1.414 1.414M7.05 16.95l-1.414 1.414M8 12a4 4 0 118 0 4 4 0 01-8 0z" />
        </svg>
      ),
    },
    {
      label: "예상 연간 발전량",
      value: annualGeneration || "산정 불가",
      accent: "bg-sky-500",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
    },
    {
      label: "예상 연간 수익",
      value: annualRevenue || "산정 불가",
      accent: "bg-emerald-500",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: analysisArea ? "분석 면적" : "설치 형태",
      value: analysisArea ?? (installType || "현장 확인 필요"),
      accent: "bg-violet-500",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
      ),
    },
  ];

  return (
    <section aria-labelledby="key-metrics-heading">
      <h2 id="key-metrics-heading" className="text-lg font-bold text-slate-900 sm:text-xl">
        핵심 지표
      </h2>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <KeyMetricCard
            key={metric.label}
            label={metric.label}
            value={metric.value}
            icon={metric.icon}
            accent={metric.accent}
          />
        ))}
      </div>
    </section>
  );
}
