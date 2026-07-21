import {
  REVIEW_STATUS_MAP,
  type ReviewStatus,
  type ReviewStatusPresentation,
} from "@/lib/result/reviewStatus";

function StatusIcon({ icon }: { icon: ReviewStatusPresentation["icon"] }) {
  const cls = "h-3.5 w-3.5 shrink-0";
  switch (icon) {
    case "check":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
      );
    case "info":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case "alert":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      );
    case "map":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      );
    case "file":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    default:
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
        </svg>
      );
  }
}

interface ReviewStatusBadgeProps {
  status: ReviewStatus;
}

export default function ReviewStatusBadge({ status }: ReviewStatusBadgeProps) {
  const presentation = REVIEW_STATUS_MAP[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[13px] font-semibold ${presentation.foreground} ${presentation.background} ${presentation.border}`}
    >
      <StatusIcon icon={presentation.icon} />
      {presentation.label}
    </span>
  );
}
