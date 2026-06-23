import type { UrbanOrdinanceNotice } from "@/types/regulatoryReview";

interface UrbanOrdinanceNoticePanelProps {
  notice: UrbanOrdinanceNotice;
}

export default function UrbanOrdinanceNoticePanel({ notice }: UrbanOrdinanceNoticePanelProps) {
  return (
    <div className="rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-white p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex rounded-md border border-indigo-200 bg-white px-2.5 py-1 text-xs font-semibold text-indigo-800">
          {notice.title}
        </span>
      </div>
      <div className="mt-4 space-y-1 text-sm leading-relaxed text-slate-800">
        {notice.paragraphs.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
    </div>
  );
}
