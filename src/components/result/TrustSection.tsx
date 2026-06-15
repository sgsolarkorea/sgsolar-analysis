import { MARKETING_NAME } from "@/data/sampleData";
import SectionHeader from "@/components/ui/SectionHeader";

const reasons = [
  "다양한 현장 조건에 맞춘 태양광 설계·시공 경험 보유",
  "현장 조건별 맞춤 설계",
  "태양광 설치·상담·시공 연계",
  "전국 시공 및 상담 가능",
  "주택·상가·공장·축사·토지형 태양광 검토 가능",
];

export default function TrustSection() {
  return (
    <section>
      <SectionHeader
        title={`${MARKETING_NAME}를 선택하는 이유`}
        description="현장 경험과 맞춤 설계를 바탕으로 태양광 설치를 안내합니다."
      />
      <div className="card-premium p-5 sm:p-6">
        <ul className="grid gap-3 sm:grid-cols-2">
          {reasons.map((reason) => (
            <li key={reason} className="flex items-start gap-3">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-navy text-xs font-bold text-white">
                ✓
              </span>
              <span className="text-sm font-medium text-slate-800">{reason}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
