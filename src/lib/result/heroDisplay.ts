import type { Grade, SuitabilityItem, SuitabilityStatus } from "@/types/siteReview";
import { GRADE_MESSAGES } from "@/types/siteReview";

export interface GradeHeroPresentation {
  letter: string;
  score: number;
  accent: string;
  summary: string;
}

const GRADE_HERO_PRESENTATION: Record<Grade, Omit<GradeHeroPresentation, "summary">> = {
  A: { letter: "A+", score: 92, accent: "매우 우수한 입지입니다" },
  B: { letter: "B+", score: 82, accent: "양호한 입지입니다" },
  C: { letter: "C", score: 68, accent: "추가 검토가 필요합니다" },
  D: { letter: "D", score: 52, accent: "신중한 검토가 필요합니다" },
};

export function gradeHeroPresentation(grade: Grade): GradeHeroPresentation {
  return {
    ...GRADE_HERO_PRESENTATION[grade],
    summary: GRADE_MESSAGES[grade],
  };
}

function suitabilityBarScore(status: SuitabilityStatus): number {
  switch (status) {
    case "pass":
      return 88;
    case "caution":
      return 68;
    case "fail":
      return 45;
  }
}

const HERO_METRIC_SOURCES: Array<{ sourceLabel: string; displayLabel: string }> = [
  { sourceLabel: "수익성 참고", displayLabel: "사업성" },
  { sourceLabel: "계통 연계", displayLabel: "계통연계" },
  { sourceLabel: "일사량 적합성", displayLabel: "토지 적합성" },
  { sourceLabel: "규제·인허가", displayLabel: "인허가 용이성" },
  { sourceLabel: "그늘·장애물", displayLabel: "위험도" },
];

export interface HeroMetricBar {
  label: string;
  score: number;
}

export function pickHeroMetricBars(items: SuitabilityItem[]): HeroMetricBar[] {
  const bars: HeroMetricBar[] = [];

  for (const source of HERO_METRIC_SOURCES) {
    const item = items.find((entry) => entry.label === source.sourceLabel);
    if (!item) continue;
    bars.push({
      label: source.displayLabel,
      score: suitabilityBarScore(item.status),
    });
  }

  if (bars.length >= 3) return bars.slice(0, 5);

  return items.slice(0, 5).map((item) => ({
    label: item.label,
    score: suitabilityBarScore(item.status),
  }));
}

export function formatReferenceDataMonth(analyzedAt: string): string {
  const parsed = Date.parse(analyzedAt.replace(/\./g, "-"));
  if (!Number.isFinite(parsed)) return "최신";
  const date = new Date(parsed);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `최신 (${y}.${m})`;
}
