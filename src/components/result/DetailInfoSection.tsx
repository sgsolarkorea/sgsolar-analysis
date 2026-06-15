import type { FieldStatus, InfoField } from "@/types/siteReview";
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

export default function DetailInfoSection({ title, fields, id }: DetailInfoSectionProps) {
  return (
    <section id={id} className={id ? "scroll-mt-24" : undefined}>
      <SectionHeader title={title} />
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
