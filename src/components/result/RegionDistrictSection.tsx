import type { RegionDistrictAnalysis, RegionDistrictFeasibility } from "@/types/landInfo";
import SectionHeader from "@/components/ui/SectionHeader";

const FEASIBILITY_STYLES: Record<RegionDistrictFeasibility, string> = {
  가능: "bg-emerald-50 text-emerald-800 border-emerald-200",
  제한: "bg-amber-50 text-amber-900 border-amber-200",
  "추가 확인 필요": "bg-slate-100 text-slate-700 border-slate-200",
};

interface RegionDistrictSectionProps {
  analysis: RegionDistrictAnalysis;
}

export default function RegionDistrictSection({ analysis }: RegionDistrictSectionProps) {
  return (
    <section id="region-district" className="scroll-mt-24">
      <SectionHeader
        title="지역/지구 분석"
        description="토지이용계획·용도지역 기준 지역·지구별 설치 검토 가능성입니다."
      />

      <div className="card-premium overflow-hidden">
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
