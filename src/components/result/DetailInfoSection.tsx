import type { FieldStatus, InfoField } from "@/types/siteReview";
import { hasBuildingRecord, hasLandRecord } from "@/lib/api/infoFallbacks";
import SectionHeader from "@/components/ui/SectionHeader";

const statusStyle: Record<FieldStatus, string> = {
  "상담 시 확인": "bg-blue-50 text-blue-800 border-blue-200",
  "추가 확인 필요": "bg-amber-50 text-amber-800 border-amber-200",
  "확인 필요": "bg-slate-100 text-slate-700 border-slate-200",
};

interface DetailInfoSectionProps {
  title: string;
  fields: InfoField[];
  id?: string;
}

function isRecordAvailable(title: string, fields: InfoField[]): boolean {
  if (title === "토지 정보") return hasLandRecord(fields);
  if (title === "건축물 정보") return hasBuildingRecord(fields);
  return fields.some((field) => field.value !== "확인 필요");
}

export default function DetailInfoSection({ title, fields, id }: DetailInfoSectionProps) {
  const hasData = isRecordAvailable(title, fields);
  const unavailableLabel = title === "토지 정보" ? "토지정보 확인 필요" : "건축물 정보 확인 필요";

  return (
    <section id={id} className={id ? "scroll-mt-24" : undefined}>
      <SectionHeader title={title} />
      {!hasData && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {unavailableLabel}
        </div>
      )}
      <div className="card-premium divide-y divide-slate-100">
        {fields.map((field) => (
          <div
            key={field.label}
            className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:py-3.5"
          >
            <span className="text-sm text-slate-500">{field.label}</span>
            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              <span className="text-sm font-semibold text-slate-900">{field.value}</span>
              {field.status && (
                <span
                  className={`rounded-md border px-2 py-0.5 text-xs font-medium ${statusStyle[field.status]}`}
                >
                  {field.status}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
