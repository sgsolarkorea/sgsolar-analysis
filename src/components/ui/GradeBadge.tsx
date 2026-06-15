import type { Grade } from "@/types/siteReview";

const gradeStyles: Record<Grade, string> = {
  A: "bg-navy text-white",
  B: "bg-navy-mid text-white",
  C: "bg-amber-600 text-white",
  D: "bg-red-600 text-white",
};

interface GradeBadgeProps {
  grade: Grade;
  size?: "sm" | "lg" | "xl";
}

export default function GradeBadge({ grade, size = "sm" }: GradeBadgeProps) {
  const sizeClass =
    size === "xl"
      ? "h-20 w-20 text-3xl rounded-2xl"
      : size === "lg"
        ? "h-16 w-16 text-2xl rounded-xl"
        : "px-2.5 py-0.5 text-sm rounded-md";

  return (
    <span
      className={`inline-flex items-center justify-center font-bold ${gradeStyles[grade]} ${sizeClass}`}
    >
      {grade}
    </span>
  );
}
