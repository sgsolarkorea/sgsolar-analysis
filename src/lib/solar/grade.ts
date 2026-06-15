import type { Grade } from "@/types/siteReview";

export function deriveGradeFromCapacity(capacityKw: number): Grade {
  if (capacityKw >= 50) return "A";
  if (capacityKw >= 20) return "B";
  if (capacityKw >= 5) return "C";
  return "D";
}
