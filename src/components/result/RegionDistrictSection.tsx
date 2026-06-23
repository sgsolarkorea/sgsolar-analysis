import type { RegionDistrictAnalysis, RegionDistrictFeasibility } from "@/types/landInfo";
import SectionHeader from "@/components/ui/SectionHeader";

const FEASIBILITY_STYLES: Record<RegionDistrictFeasibility, string> = {
  가능: "bg-emerald-50 text-emerald-800 border-emerald-200",
  제한: "bg-amber-50 text-amber-900 border-amber-200",
  "확인 완료": "bg-blue-50 text-blue-800 border-blue-200",
  "기본 확인": "bg-slate-50 text-slate-700 border-slate-200",
  "추가 확인 필요": "bg-slate-100 text-slate-700 border-slate-200",
};

interface RegionDistrictSectionProps {
  analysis: RegionDistrictAnalysis;
}

export default function RegionDistrictSection({ analysis }: RegionDistrictSectionProps) {
  const confirmedAt = analysis.collectedAt
    ? new Intl.DateTimeFormat("ko-KR", {
        timeZone: "Asia/Seoul",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      })
        .format(new Date(analysis.collectedAt))
        .replace(/\./g, "-")
        .replace(/\s/g, "")
        .replace(/-$/, "")
    : null;

  return (
    <section id="region-district" className="scroll-mt-24">
      <SectionHeader
        title="지역/지구 분석"
        description="토지이용계획 기준 용도지역·지구·구역 1차 확인 결과입니다."
        compact
      />

      <div className="card-premium overflow-hidden rounded-lg">
        {(analysis.dataSource || confirmedAt) && (
          <div className="border-b border-slate-100 bg-slate-50 px-3 py-1.5 text-[11px] text-slate-600">
            {analysis.dataSource ?? "토지이용계획"}
            {confirmedAt ? ` · 확인일 ${confirmedAt}` : ""}
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[32rem] table-fixed text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-600">
              <tr>
                <th className="w-[32%] px-3 py-2 font-semibold">지역/지구</th>
                <th className="w-[18%] px-3 py-2 font-semibold">가능여부</th>
                <th className="w-[50%] px-3 py-2 font-semibold">조건/제한사항</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {analysis.rows.map((row) => (
                <tr key={row.district} className="hover:bg-slate-50/60">
                  <td className="px-3 py-2 align-top font-semibold text-slate-900">{row.district}</td>
                  <td className="px-3 py-2 align-top">
                    <span
                      className={`inline-flex max-w-full whitespace-normal rounded border px-1.5 py-0.5 text-[10px] font-semibold leading-tight sm:text-[11px] ${FEASIBILITY_STYLES[row.feasibility]}`}
                    >
                      {row.feasibility}
                    </span>
                  </td>
                  <td className="px-3 py-2 align-top text-xs leading-snug break-words text-slate-700 sm:text-sm">
                    {row.condition}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {analysis.sourceNote && (
        <p className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-[11px] font-medium leading-snug text-slate-600 sm:text-xs">
          {analysis.sourceNote}
        </p>
      )}
    </section>
  );
}
