interface AnalysisOverviewProps {
  capacity: string;
  annualGeneration: string;
  annualRevenue: string;
  constructionCost: string;
  recWeight: string;
  analysisArea?: string;
  installType: string;
  isHousehold?: boolean;
  householdSavingsLabel?: string;
  householdSavingsValue?: string;
}

function LargeMetric({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-3 text-[30px] font-extrabold leading-tight tracking-tight text-navy sm:text-[34px]">
        {value}
      </p>
      {hint ? <p className="mt-2 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

function CompactMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
      <p className="text-xs font-medium text-slate-500 sm:text-[13px]">{label}</p>
      <p className="mt-2 text-[22px] font-bold leading-snug text-navy sm:text-[24px]">{value}</p>
    </div>
  );
}

export default function AnalysisOverview({
  capacity,
  annualGeneration,
  annualRevenue,
  constructionCost,
  recWeight,
  analysisArea,
  installType,
  isHousehold = false,
  householdSavingsLabel,
  householdSavingsValue,
}: AnalysisOverviewProps) {
  const primaryRevenueLabel = isHousehold
    ? householdSavingsLabel ?? "월 예상 절감액"
    : "예상 연간 수익";
  const primaryRevenueValue = isHousehold
    ? householdSavingsValue ?? annualRevenue
    : annualRevenue;

  return (
    <section id="analysis-overview" className="scroll-mt-24" aria-labelledby="analysis-overview-heading">
      <h2 id="analysis-overview-heading" className="text-2xl font-extrabold tracking-tight text-navy sm:text-[28px]">
        입지 분석 개요
      </h2>
      <p className="mt-2 text-[15px] text-slate-600">
        공공데이터와 자체 산정 기준을 활용한 1차 사업성 요약입니다.
      </p>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <LargeMetric label="예상 설치용량" value={capacity || "산정 불가"} hint="1차 산정 기준" />
        <LargeMetric label="예상 연간 발전량" value={annualGeneration || "산정 불가"} hint="지역 일사량 반영" />
        <LargeMetric label={primaryRevenueLabel} value={primaryRevenueValue || "산정 불가"} hint="시장단가 기준 참고" />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <CompactMetric label="예상 시공비" value={constructionCost || "산정 불가"} />
        <CompactMetric label="REC 가중치" value={recWeight || "—"} />
        {analysisArea ? <CompactMetric label="분석 면적" value={analysisArea} /> : null}
        <CompactMetric label="설치 형태" value={installType || "현장 확인 필요"} />
      </div>
    </section>
  );
}
