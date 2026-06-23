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
        description="VWorld 토지이용계획 기준 용도지역·지구·구역 1차 확인 결과입니다."
      />

      <div className="card-premium overflow-hidden">
        {(analysis.dataSource || confirmedAt) && (
          <div className="border-b border-slate-100 bg-slate-50 px-4 py-2.5 text-xs text-slate-600">
            {analysis.dataSource ?? "VWorld 토지이용계획"}
            {confirmedAt ? ` · 확인일 ${confirmedAt}` : ""}
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-4 py-3 font-semibold">지역/지구</th>
                <th className="px-4 py-3 font-semibold">가능여부</th>
                <th className="px-4 py-3 font-semibold">조건/제한사항</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {analysis.rows.map((row) => (
                <tr key={row.district} className="hover:bg-slate-50/60">
                  <td className="whitespace-nowrap px-4 py-3.5 font-semibold text-slate-900">
                    {row.district}
                  </td>
                  <td className="px-4 py-3.5">
                    <span
                      className={`inline-flex rounded-md border px-2.5 py-1 text-xs font-semibold ${FEASIBILITY_STYLES[row.feasibility]}`}
                    >
                      {row.feasibility}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-slate-700">{row.condition}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {analysis.sourceNote && (
        <p className="mt-3 text-sm font-medium leading-relaxed text-slate-500">{analysis.sourceNote}</p>
      )}
    </section>
  );
}
