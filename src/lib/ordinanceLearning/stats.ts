import { createOrdinanceSlug } from "@/lib/ordinanceLearning/slug";
import { listOrdinanceAdminRows } from "@/lib/ordinanceLearning/registry";
import { extractMunicipalityLabel, listOrdinanceSlugs } from "@/lib/regulatory/loadOrdinance";
import { listSearchHistory } from "@/lib/searchHistory/storage";
import type {
  MunicipalitySearchStat,
  OrdinanceRecordStatus,
  SearchDashboardStats,
} from "@/types/ordinanceLearning";

const STATIC_SLUGS = new Set(listOrdinanceSlugs());

function startOfDayKst(date: Date): Date {
  const kst = new Date(date.toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
  kst.setHours(0, 0, 0, 0);
  return kst;
}

function daysAgoKst(days: number): Date {
  const now = startOfDayKst(new Date());
  now.setDate(now.getDate() - days);
  return now;
}

function resolveOrdinanceStatus(slug: string, label: string): OrdinanceRecordStatus {
  if (STATIC_SLUGS.has(slug)) return "approved";
  return "unregistered";
}

export async function buildSearchDashboardStats(): Promise<SearchDashboardStats> {
  const entries = await listSearchHistory(2000);
  const adminRows = await listOrdinanceAdminRows();
  const adminByLabel = new Map(adminRows.map((row) => [row.municipalityLabel, row]));

  const todayStart = startOfDayKst(new Date());
  const weekStart = daysAgoKst(7);
  const monthStart = daysAgoKst(30);

  let todayCount = 0;
  let weekCount = 0;
  let monthCount = 0;
  let consultationCount = 0;

  const municipalityMap = new Map<string, MunicipalitySearchStat>();

  for (const entry of entries) {
    const searchedAt = new Date(entry.searchedAt);
    if (searchedAt >= todayStart) todayCount += 1;
    if (searchedAt >= weekStart) weekCount += 1;
    if (searchedAt >= monthStart) monthCount += 1;
    if (entry.consultSubmitted) consultationCount += 1;

    const municipalityLabel = extractMunicipalityLabel(entry.address);
    const slug = createOrdinanceSlug(municipalityLabel);
    const existing = municipalityMap.get(municipalityLabel);
    const adminRow = adminByLabel.get(municipalityLabel);

    if (existing) {
      existing.searchCount += 1;
      if (!existing.lastSearchedAt || entry.searchedAt > existing.lastSearchedAt) {
        existing.lastSearchedAt = entry.searchedAt;
      }
    } else {
      municipalityMap.set(municipalityLabel, {
        municipalityLabel,
        slug,
        searchCount: 1,
        lastSearchedAt: entry.searchedAt,
        ordinanceStatus: adminRow?.status ?? resolveOrdinanceStatus(slug, municipalityLabel),
        isRegistered: adminRow?.status === "approved" || STATIC_SLUGS.has(slug),
      });
    }
  }

  const municipalityStats = Array.from(municipalityMap.values()).sort(
    (a, b) => b.searchCount - a.searchCount,
  );

  return {
    todayCount,
    weekCount,
    monthCount,
    totalCount: entries.length,
    consultationCount,
    consultationConversionRate:
      entries.length > 0 ? Math.round((consultationCount / entries.length) * 1000) / 10 : 0,
    popularRegions: municipalityStats.slice(0, 10),
    unregisteredTopRegions: municipalityStats
      .filter((item) => !item.isRegistered)
      .slice(0, 10),
  };
}
