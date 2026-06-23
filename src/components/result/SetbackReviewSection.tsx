import type { SetbackJudgment, SetbackReview } from "@/types/regulatoryReview";
import SectionHeader from "@/components/ui/SectionHeader";
import { SETBACK_COMMON_STANDARD_NOTICE, SETBACK_SECTION_FOOTER, SETBACK_STANDARD_COLUMN_LABEL } from "@/lib/regulatory/setbackDisplay";

const JUDGMENT_STYLES: Record<SetbackJudgment, string> = {
  "기본 확인": "bg-blue-50 text-blue-800 border-blue-200",
  "거리 검토 필요": "bg-orange-50/80 text-orange-800 border-orange-100",
  "공공데이터 확인 필요": "bg-slate-100 text-slate-600 border-slate-200",
  "추가 검토 필요": "bg-orange-50/80 text-orange-800 border-orange-100",
  "조례 확인 필요": "bg-orange-50/80 text-orange-800 border-orange-100",
  "데이터 확인 필요": "bg-slate-100 text-slate-600 border-slate-200",
  적합: "bg-blue-50 text-blue-800 border-blue-200",
  "검토 필요": "bg-orange-50/80 text-orange-800 border-orange-100",
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
        description="주요 시설물·경계까지의 예상 거리입니다."
        compact
      />

      {review.notice && (
        <div className="mb-3 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs leading-snug text-blue-900 sm:text-sm">
          {review.notice}
        </div>
      )}

      <div className="mb-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs leading-snug text-slate-700 sm:text-sm">
        {SETBACK_COMMON_STANDARD_NOTICE}
      </div>

      <div className="card-premium overflow-hidden rounded-lg">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[36rem] table-fixed text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-600">
              <tr>
                <th className="w-[18%] px-3 py-2 font-semibold">검토 항목</th>
                <th className="w-[14%] px-3 py-2 font-semibold">{SETBACK_STANDARD_COLUMN_LABEL}</th>
                <th className="w-[14%] px-3 py-2 font-semibold">예상 거리</th>
                <th className="w-[16%] px-3 py-2 font-semibold">검토 상태</th>
                <th className="w-[38%] px-3 py-2 font-semibold">안내</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {review.rows.map((row) => (
                <tr key={row.item} className="hover:bg-slate-50/60">
                  <td className="px-3 py-2 align-top text-slate-900">
                    <div className="font-semibold">{row.item}</div>
                    {row.detail && <div className="mt-px text-[11px] text-slate-500">{row.detail}</div>}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 align-top text-slate-700">{row.standard}</td>
                  <td className="whitespace-nowrap px-3 py-2 align-top font-medium text-slate-900">
                    {row.measured}
                  </td>
                  <td className="px-3 py-2 align-top">
                    <span
                      className={`inline-flex max-w-full whitespace-normal rounded border px-1.5 py-0.5 text-[10px] font-semibold leading-tight sm:text-[11px] ${JUDGMENT_STYLES[row.judgment]}`}
                    >
                      {row.judgment}
                    </span>
                  </td>
                  <td className="px-3 py-2 align-top text-xs leading-snug break-words text-slate-600 sm:text-sm">
                    {row.remark ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-[11px] font-medium leading-snug text-slate-600 sm:text-xs">
        {SETBACK_SECTION_FOOTER}
      </p>
    </section>
  );
}
