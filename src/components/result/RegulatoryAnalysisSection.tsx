import type { LayerARegulatoryAnalysis, LayerARegulatoryLevel } from "@/types/landInfo";
import SectionHeader from "@/components/ui/SectionHeader";

const LEVEL_STYLES: Record<LayerARegulatoryLevel, string> = {
  "제한 가능성 높음": "bg-amber-50 text-amber-900 border-amber-200",
  "추가 검토 필요": "bg-orange-50/80 text-orange-800 border-orange-100",
  "기본 확인": "bg-blue-50 text-blue-800 border-blue-200",
  "해당 없음": "bg-slate-50 text-slate-600 border-slate-200",
};

interface RegulatoryAnalysisSectionProps {
  analysis: LayerARegulatoryAnalysis;
}

function formatCollectedAt(iso?: string): string | null {
  if (!iso) return null;
  try {
    return new Intl.DateTimeFormat("ko-KR", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .format(new Date(iso))
      .replace(/\./g, "-")
      .replace(/\s/g, "")
      .replace(/-$/, "");
  } catch {
    return null;
  }
}

export default function RegulatoryAnalysisSection({ analysis }: RegulatoryAnalysisSectionProps) {
  const confirmedAt = formatCollectedAt(analysis.collectedAt);

  return (
    <section id="regulatory-analysis" className="scroll-mt-24">
      <SectionHeader
        title="법·규제 분석"
        description="공공 GIS 토지이용계획 기반 Layer A 1차 규제 검토입니다."
        compact
      />

      {analysis.rows.length === 0 ? (
        <div className="card-premium rounded-lg p-4 sm:p-5">
          <p className="text-xs leading-snug text-slate-600 sm:text-sm">
            토지이용계획 GIS 데이터를 조회하지 못해 규제 1차 검토 결과가 없습니다. 상담 시 추가
            확인합니다.
          </p>
        </div>
      ) : (
        <div className="card-premium overflow-hidden rounded-lg">
          {confirmedAt && (
            <div className="border-b border-slate-100 bg-slate-50 px-3 py-1.5 text-[11px] text-slate-600">
              토지이용계획 확인 · {confirmedAt}
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] table-fixed text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="w-[18%] px-3 py-2 font-semibold">규제 항목</th>
                  <th className="w-[18%] px-3 py-2 font-semibold">해당 구역</th>
                  <th className="w-[14%] px-3 py-2 font-semibold">1차 판단</th>
                  <th className="w-[50%] px-3 py-2 font-semibold">요약</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {analysis.rows.map((row) => (
                  <tr key={`${row.item}-${row.matchedZone ?? ""}`} className="hover:bg-slate-50/60">
                    <td className="px-3 py-2 align-top font-semibold text-slate-900">
                      {row.item}
                    </td>
                    <td className="px-3 py-2 align-top text-slate-700">{row.matchedZone ?? "—"}</td>
                    <td className="px-3 py-2 align-top">
                      <span
                        className={`inline-flex max-w-full whitespace-normal rounded border px-1.5 py-0.5 text-[10px] font-semibold leading-tight sm:text-[11px] ${LEVEL_STYLES[row.level]}`}
                      >
                        {row.level}
                      </span>
                    </td>
                    <td className="px-3 py-2 align-top text-xs leading-snug break-words text-slate-700 sm:text-sm">
                      {row.summary}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {analysis.sourceNote && (
        <p className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-[11px] font-medium leading-snug text-slate-600 sm:text-xs">
          {analysis.sourceNote}
        </p>
      )}
    </section>
  );
}
