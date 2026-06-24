import type { OrdinanceInfoKind, OrdinanceInfoRow } from "@/types/regulatoryReview";

const KIND_STYLES: Record<OrdinanceInfoKind, string> = {
  조례: "bg-sky-50 text-sky-800 border-sky-200",
  규칙: "bg-violet-50 text-violet-800 border-violet-200",
  지침: "bg-emerald-50 text-emerald-800 border-emerald-200",
  고시: "bg-amber-50 text-amber-900 border-amber-200",
};

function KindBadge({ kind }: { kind: OrdinanceInfoKind }) {
  return (
    <span
      className={`inline-flex shrink-0 rounded-md border px-2 py-0.5 text-[11px] font-semibold sm:text-xs ${KIND_STYLES[kind]}`}
    >
      {kind}
    </span>
  );
}

function formatDate(value: string | null): string {
  return value ?? "확인 필요";
}

function LawNameCell({ row }: { row: OrdinanceInfoRow }) {
  if (row.sourceUrl) {
    return (
      <a
        href={row.sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-navy underline decoration-navy/30 underline-offset-2 transition hover:text-navy/80 hover:decoration-navy/60"
      >
        {row.name}
      </a>
    );
  }

  return (
    <span className="font-medium text-slate-700">
      {row.name}
      <span className="ml-2 text-xs font-normal text-slate-500">(확인 필요)</span>
    </span>
  );
}

interface OrdinanceInfoTableProps {
  rows: OrdinanceInfoRow[];
}

export default function OrdinanceInfoTable({ rows }: OrdinanceInfoTableProps) {
  if (rows.length === 0) {
    return (
      <div className="card-premium rounded-lg p-4 sm:p-5">
        <p className="text-sm leading-relaxed text-slate-600">
          해당 지역의 공식 조례 목록을 준비 중입니다. 조례 요약 카드와 상담을 통해 확인합니다.
        </p>
      </div>
    );
  }

  return (
    <div className="card-premium overflow-hidden rounded-lg shadow-sm">
      {/* Desktop table */}
      <div className="hidden md:block">
        <table className="w-full table-fixed text-left text-sm">
          <thead className="bg-navy text-white">
            <tr>
              <th className="w-[12%] px-4 py-3 text-center text-xs font-semibold">종류</th>
              <th className="w-[58%] px-4 py-3 text-center text-xs font-semibold">법규명</th>
              <th className="w-[30%] px-4 py-3 text-center text-xs font-semibold">제/개정일</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-slate-50/70">
                <td className="px-4 py-3 text-center align-middle">
                  <div className="flex justify-center">
                    <KindBadge kind={row.kind} />
                  </div>
                </td>
                <td className="px-4 py-3 text-center align-middle">
                  <LawNameCell row={row} />
                </td>
                <td className="px-4 py-3 text-center align-middle text-slate-700">
                  {formatDate(row.revisedAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile stacked cards — no horizontal scroll */}
      <div className="divide-y divide-slate-100 md:hidden">
        {rows.map((row) => (
          <div key={row.id} className="space-y-2 bg-white px-4 py-3.5">
            <div className="flex items-start justify-between gap-3">
              <KindBadge kind={row.kind} />
              <span className="shrink-0 text-xs text-slate-500">{formatDate(row.revisedAt)}</span>
            </div>
            <div className="text-sm leading-snug">
              <LawNameCell row={row} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
