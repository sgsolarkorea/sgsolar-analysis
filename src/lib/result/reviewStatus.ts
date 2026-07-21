export type ReviewStatus =
  | "confirmed"
  | "reviewable"
  | "needs_review"
  | "site_check"
  | "insufficient_data"
  | "not_applicable";

export interface ReviewStatusPresentation {
  label: string;
  icon: "check" | "info" | "alert" | "map" | "minus" | "file";
  foreground: string;
  background: string;
  border: string;
}

export const REVIEW_STATUS_MAP: Record<ReviewStatus, ReviewStatusPresentation> = {
  confirmed: {
    label: "확인 완료",
    icon: "check",
    foreground: "text-emerald-800",
    background: "bg-emerald-50",
    border: "border-emerald-200",
  },
  reviewable: {
    label: "검토 가능",
    icon: "info",
    foreground: "text-blue-800",
    background: "bg-blue-50",
    border: "border-blue-200",
  },
  needs_review: {
    label: "추가 확인 필요",
    icon: "alert",
    foreground: "text-amber-800",
    background: "bg-amber-50",
    border: "border-amber-200",
  },
  site_check: {
    label: "현장 확인 필요",
    icon: "map",
    foreground: "text-orange-800",
    background: "bg-orange-50",
    border: "border-orange-200",
  },
  insufficient_data: {
    label: "자료 부족",
    icon: "file",
    foreground: "text-slate-700",
    background: "bg-slate-100",
    border: "border-slate-200",
  },
  not_applicable: {
    label: "해당 없음",
    icon: "minus",
    foreground: "text-slate-600",
    background: "bg-slate-50",
    border: "border-slate-200",
  },
};

export interface ReviewStatusItem {
  key: string;
  label: string;
  status: ReviewStatus;
  description: string;
}
