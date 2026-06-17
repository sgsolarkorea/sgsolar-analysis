import type { LandInfoDetail } from "@/types/landInfo";
import SectionHeader from "@/components/ui/SectionHeader";

interface LandInfoCardSectionProps {
  detail: LandInfoDetail;
}

interface CardItem {
  label: string;
  value: string;
  highlight?: boolean;
}

function buildCards(detail: LandInfoDetail): CardItem[] {
  const cards: CardItem[] = [
    { label: "지목", value: detail.landCategory, highlight: true },
    { label: "면적", value: detail.area, highlight: true },
    { label: "용도지역", value: detail.zoning, highlight: true },
  ];

  if (detail.zoningSecondary) {
    cards.push({ label: "용도지구", value: detail.zoningSecondary });
  }

  if (detail.officialLandPrice) {
    cards.push({ label: "공시지가", value: detail.officialLandPrice, highlight: true });
  }

  if (detail.priceReferenceYear) {
    cards.push({ label: "공시지가 기준연도", value: `${detail.priceReferenceYear}년` });
  }

  if (detail.priceReferenceDate) {
    cards.push({ label: "지적도 업데이트 기준일", value: detail.priceReferenceDate });
  }

  if (detail.ownershipType) {
    cards.push({ label: "소유구분", value: detail.ownershipType });
  } else {
    cards.push({ label: "소유구분", value: "추가 확인 필요" });
  }

  if (detail.regionDistrictSummary) {
    cards.push({ label: "지역·지구", value: detail.regionDistrictSummary });
  }

  if (detail.landUseSituation) {
    cards.push({ label: "토지이용계획", value: detail.landUseSituation });
  }

  return cards;
}

export default function LandInfoCardSection({ detail }: LandInfoCardSectionProps) {
  const cards = buildCards(detail);
  const hasApiData = detail.dataSource === "api";

  return (
    <section id="land-info" className="scroll-mt-24">
      <SectionHeader
        title="토지 정보"
        description="VWorld 토지특성·공시지가 기준으로 조회한 토지 정보입니다."
      />

      {!hasApiData && (
        <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
          현장 상담 시 추가 확인이 필요합니다.
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <div
            key={card.label}
            className={`card-premium p-4 sm:p-5 ${
              card.highlight ? "border-navy/15 bg-gradient-to-br from-white to-navy-light/30" : ""
            }`}
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {card.label}
            </p>
            <p
              className={`mt-2 text-base font-bold leading-snug ${
                card.highlight ? "text-navy" : "text-slate-900"
              }`}
            >
              {card.value}
            </p>
          </div>
        ))}
      </div>

      <p className="mt-3 text-xs leading-relaxed text-slate-500">
        공시지가·소유구분은 VWorld API 제공 범위 내에서 표시하며, 미제공 항목은 현장 확인이 필요합니다.
      </p>
    </section>
  );
}
