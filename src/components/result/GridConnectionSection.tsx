import type { GridInfo } from "@/types/siteReview";
import SectionHeader from "@/components/ui/SectionHeader";

interface GridConnectionSectionProps {
  gridInfo: GridInfo;
  disclaimer: string;
}

export default function GridConnectionSection({
  gridInfo,
  disclaimer,
}: GridConnectionSectionProps) {
  const rows = [
    { label: "관할 한전 지사", value: gridInfo.kepcoBranch },
    { label: "인근 변전소", value: gridInfo.nearbySubstation },
    { label: "배전선로", value: gridInfo.distributionLine },
    { label: "예상 접속 가능성", value: gridInfo.connectionPossibility },
    { label: "추가 검토 필요 여부", value: gridInfo.additionalReviewRequired },
  ];

  return (
    <section id="grid" className="scroll-mt-24">
      <SectionHeader
        title="계통 연계 여유"
        description="한국전력 계통 연계 1차 검토 결과입니다."
      />
      <div className="card-premium overflow-hidden">
        <div className="border-b border-emerald-200 bg-emerald-50 px-5 py-3">
          <p className="text-sm font-semibold text-emerald-900">
            상태: {gridInfo.statusMessage}
          </p>
        </div>
        <div className="divide-y divide-slate-100">
          {rows.map((row) => (
            <div
              key={row.label}
              className="flex flex-col gap-1 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:py-3.5"
            >
              <span className="text-sm text-slate-500">{row.label}</span>
              <span className="text-sm font-semibold text-slate-900">{row.value}</span>
            </div>
          ))}
        </div>
        <div className="border-t border-amber-200 bg-amber-50 px-5 py-3">
          <p className="text-xs leading-relaxed text-amber-900 sm:text-sm">⚠ {disclaimer}</p>
        </div>
      </div>
    </section>
  );
}
