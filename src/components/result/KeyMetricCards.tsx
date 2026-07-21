interface KeyMetricCardProps {
  label: string;
  value: string;
  unit?: string;
}

export default function KeyMetricCard({ label, value, unit }: KeyMetricCardProps) {
  const unavailable = value === "산정 불가" || value === "현장 확인 필요";

  return (
    <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <p className="text-[13px] font-medium text-slate-500 sm:text-sm">{label}</p>
      <p
        className={`mt-2 text-[26px] font-bold leading-tight tracking-tight sm:text-[30px] ${
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
    { label: "예상 설치용량", value: capacity || "산정 불가" },
    { label: "예상 연간 발전량", value: annualGeneration || "산정 불가" },
    { label: "예상 연간 수익", value: annualRevenue || "산정 불가" },
    { label: analysisArea ? "분석 면적" : "설치 형태", value: analysisArea ?? (installType || "현장 확인 필요") },
  ];

  return (
    <section aria-labelledby="key-metrics-heading">
      <h2 id="key-metrics-heading" className="text-lg font-bold text-slate-900 sm:text-xl">
        핵심 지표
      </h2>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <KeyMetricCard key={metric.label} label={metric.label} value={metric.value} />
        ))}
      </div>
    </section>
  );
}
