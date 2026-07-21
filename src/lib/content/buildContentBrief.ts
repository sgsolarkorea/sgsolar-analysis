import { resolveDisplayRevenueLabels, type DisplayRevenueLabels } from "@/lib/content/revenueLabels";
import type { SiteReviewResult } from "@/types/siteReview";

/**
 * F-8 ContentBrief — KPI·쇼츠·블로그 공통 정규화 (초안)
 * 수익·용량은 SiteReviewResult와 동일 소스만 사용 (임의 추정 금지)
 */
export interface ContentBriefKpis extends DisplayRevenueLabels {
  moduleCount: number;
  moduleCountLabel: string;
  installType: string;
  installCategory: string;
}

export interface ContentBrief {
  jobId?: string;
  analyzedAt: string;
  displayRegion: string;
  installType: string;
  installCategory: string;
  recommendation: string;
  kpis: ContentBriefKpis;
  lat: number;
  lng: number;
}

export function buildContentBriefFromSiteReview(
  data: SiteReviewResult,
  options?: { displayRegion?: string; jobId?: string },
): ContentBrief {
  const revenue = resolveDisplayRevenueLabels({
    installType: data.solarMetrics.installType,
    capacityKw: data.solarMetrics.capacityKw,
    totalRevenueWon: data.solarMetrics.totalRevenueWon,
  });

  return {
    jobId: options?.jobId,
    analyzedAt: data.analyzedAt,
    displayRegion: options?.displayRegion ?? data.address,
    installType: data.solarMetrics.installType,
    installCategory: data.solarMetrics.installCategory,
    recommendation: data.recommendation,
    lat: data.lat,
    lng: data.lng,
    kpis: {
      ...revenue,
      moduleCount: data.solarMetrics.moduleCount,
      moduleCountLabel: `모듈 ${data.solarMetrics.moduleCount.toLocaleString("ko-KR")}장`,
      installType: data.solarMetrics.installType,
      installCategory: data.solarMetrics.installCategory,
    },
  };
}
