import type { FieldStatus, InfoField } from "@/types/siteReview";
import { hasBuildingRecord, hasLandRecord } from "@/lib/api/infoFallbacks";
import SectionHeader from "@/components/ui/SectionHeader";

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

function hasMissingValues(fields: InfoField[]): boolean {
  return fields.some((field) => !field.value || field.value === "확인 필요");
}

export default function DetailInfoSection({ title, fields, id }: DetailInfoSectionProps) {
  const hasData = isRecordAvailable(title, fields);
  const showFieldNotice = hasData && hasMissingValues(fields);

  return (
    <section id={id} className={id ? "scroll-mt-24" : undefined}>
      <SectionHeader title={title} />
      {!hasData && (
        <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
          현장 상담 시 추가 확인이 필요합니다.
        </div>
      )}
      <div className="card-premium divide-y divide-slate-100">
        {fields.map((field) => (
          <div
            key={field.label}
            className="flex flex-col gap-1 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:py-3.5"
          >
            <span className="text-sm text-slate-500">{field.label}</span>
            <span className="text-sm font-semibold text-slate-900 sm:text-right">{field.value}</span>
          </div>
        ))}
      </div>
      {showFieldNotice && (
        <p className="mt-3 text-xs leading-relaxed text-slate-500">
          현장 상담 시 추가 확인이 필요합니다.
        </p>
      )}
    </section>
  );
}
