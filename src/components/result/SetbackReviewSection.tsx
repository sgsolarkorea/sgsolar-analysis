import type { SetbackJudgment, SetbackReview } from "@/types/regulatoryReview";
import SectionHeader from "@/components/ui/SectionHeader";

const JUDGMENT_STYLES: Record<SetbackJudgment, string> = {
  적합: "bg-emerald-50 text-emerald-800 border-emerald-200",
  "검토 필요": "bg-amber-50 text-amber-900 border-amber-200",
  "추가 확인": "bg-slate-100 text-slate-700 border-slate-200",
  "조례 기준 확인 필요": "bg-slate-100 text-slate-600 border-slate-200",
};

interface SetbackReviewSectionProps {
  review: SetbackReview;
}

export default function SetbackReviewSection({ review }: SetbackReviewSectionProps) {
  return (
    <section id="setback-review" className="scroll-mt-24">
      <SectionHeader
        title="이격거리 검토"
        description="주요 시설물·경계와의 이격거리 기준을 참고용으로 정리했습니다."
      />

      {review.notice && (
        <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm leading-relaxed text-blue-900">
          {review.notice}
        </div>
      )}

      <div className="card-premium overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-4 py-3 font-semibold">항목</th>
                <th className="px-4 py-3 font-semibold">기준</th>
                <th className="px-4 py-3 font-semibold">확인 상태</th>
                <th className="px-4 py-3 font-semibold">판정</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {review.rows.map((row) => (
                <tr key={row.item} className="hover:bg-slate-50/60">
                  <td className="px-4 py-3.5 text-slate-900">
                    <div className="font-semibold">{row.item}</div>
                    {row.detail && <div className="mt-0.5 text-xs text-slate-500">{row.detail}</div>}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3.5 text-slate-700">{row.standard}</td>
                  <td className="max-w-xs px-4 py-3.5 text-slate-700">{row.measured}</td>
                  <td className="px-4 py-3.5">
                    <span
                      className={`inline-flex rounded-md border px-2.5 py-1 text-xs font-semibold ${JUDGMENT_STYLES[row.judgment]}`}
                    >
                      {row.judgment}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="mt-3 text-sm font-medium leading-relaxed text-slate-500">
        자동 실측 연동 전 단계이며, 최종 이격거리는 현장·GIS 측정 및 지자체 조례 확인 후 판단합니다.
      </p>
    </section>
  );
}
