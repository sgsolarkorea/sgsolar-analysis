import { mergeParsedAddresses, parseKepcoAddress } from "@/lib/kepco/parseKepcoAddress";
import { findRegulationSources } from "@/lib/regulatory/koreaRegionRegistry";
import {
  enrichCandidateForDisplay,
  lookupParsedCandidate,
} from "@/lib/regulatory/parsedCandidatesDb";
import { lookupManualOverride } from "@/lib/regulatory/setbackManualOverrideDb";
import type {
  MunicipalityOrdinanceData,
  OrdinanceDisplayResult,
  OrdinanceInfoKind,
  OrdinanceInfoListResult,
  OrdinanceInfoRow,
  RegulationSourceEntry,
  RegulationSourceType,
} from "@/types/regulatoryReview";

const METRO_SIDOS = new Set([
  "서울특별시",
  "부산광역시",
  "대구광역시",
  "인천광역시",
  "광주광역시",
  "대전광역시",
  "울산광역시",
]);

const SOLAR_DIRECT_RE = /태양광|태양\s*에너지|신재생|발전시설/i;
const PLANNING_RE = /도시\s*계획|군\s*계획|군계획|개발행위허가/i;

const MAX_ROWS = 5;

function normalizeName(name: string): string {
  return name.replace(/\s+/g, "").trim();
}

function toLawSlug(name: string): string {
  return name.replace(/\s/g, "");
}

function buildLawSlugUrl(name: string): string {
  return `https://www.law.go.kr/자치법규/${toLawSlug(name)}`;
}

function mapSourceTypeToKind(type: RegulationSourceType): OrdinanceInfoKind {
  switch (type) {
    case "guideline":
      return "지침";
    case "permit_rule":
      return "규칙";
    case "notice":
      return "고시";
    default:
      return "조례";
  }
}

function scoreOrdinanceName(name: string, type: RegulationSourceType): number {
  let score = 0;
  if (SOLAR_DIRECT_RE.test(name)) score += 100;
  if (PLANNING_RE.test(name)) score += 80;
  if (type === "ordinance" || type === "solar_policy") score += 20;
  if (/조례/.test(name)) score += 10;
  if (type === "guideline") score += 15;
  return score;
}

function formatDate(value?: string | null): string | null {
  if (!value?.trim()) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  if (/^\d{8}$/.test(value)) {
    return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
  }
  return value.slice(0, 10);
}

function sourceOriginLabel(origin?: string, collectionMethod?: string): string {
  if (collectionMethod === "openapi" || origin === "openapi.law.go.kr") {
    return "Open API · ELIS";
  }
  if (origin === "elis.go.kr") return "ELIS";
  if (origin === "law.go.kr") return "law.go.kr";
  if (origin === "municipal") return "지자체";
  return "공식 조례";
}

/**
 * 링크 우선순위: Open API/ELIS ordinInfoP → law.go.kr → slug URL
 */
function resolveOfficialUrl(input: {
  sourceUrl?: string;
  openapiMst?: string;
  sourceOrigin?: string;
  name: string;
}): { url: string | null; originLabel: string } {
  const url = input.sourceUrl?.trim();
  if (url?.startsWith("http")) {
    return {
      url,
      originLabel: sourceOriginLabel(
        input.sourceOrigin,
        url.includes("gubun=ELIS") ? "openapi" : undefined,
      ),
    };
  }

  if (input.openapiMst) {
    return {
      url: `https://www.law.go.kr/LSW/ordinInfoP.do?ordinSeq=${input.openapiMst}&gubun=ELIS`,
      originLabel: "Open API · ELIS",
    };
  }

  if (input.name) {
    return {
      url: buildLawSlugUrl(input.name),
      originLabel: "law.go.kr",
    };
  }

  return { url: null, originLabel: "확인 필요" };
}

function pushRow(
  bucket: Map<string, OrdinanceInfoRow>,
  row: Omit<OrdinanceInfoRow, "id"> & { id?: string },
) {
  const key = normalizeName(row.name);
  const existing = bucket.get(key);
  const next: OrdinanceInfoRow = {
    id: row.id ?? key,
    kind: row.kind,
    name: row.name,
    revisedAt: row.revisedAt,
    sourceUrl: row.sourceUrl,
    sourceOriginLabel: row.sourceOriginLabel,
    priority: row.priority,
  };

  if (!existing || next.priority > existing.priority || (!existing.sourceUrl && next.sourceUrl)) {
    bucket.set(key, {
      ...next,
      revisedAt: next.revisedAt ?? existing?.revisedAt ?? null,
      sourceUrl: next.sourceUrl ?? existing?.sourceUrl ?? null,
      sourceOriginLabel: next.sourceOriginLabel ?? existing?.sourceOriginLabel,
      priority: Math.max(next.priority, existing?.priority ?? 0),
    });
  }
}

function shouldIncludeSidoOrdinance(sido: string, sigungu: string): boolean {
  if (METRO_SIDOS.has(sido) || sido === "세종특별자치시" || sido === "제주특별자치도") {
    return false;
  }
  return sigungu.endsWith("군") || sigungu.endsWith("시");
}

function sidoPlanningOrdinanceName(sido: string): string {
  return `${sido} 도시계획 조례`;
}

export function resolveOrdinanceInfoList(
  address: string,
  jibunAddress = "",
  display?: OrdinanceDisplayResult | null,
  legacyReview?: MunicipalityOrdinanceData | null,
): OrdinanceInfoListResult {
  const parsed = mergeParsedAddresses(
    parseKepcoAddress(address.trim()),
    parseKepcoAddress(jibunAddress.trim()),
  );
  const municipalityLabel = parsed.sigungu ?? parsed.sido ?? display?.municipalityLabel ?? "해당 지자체";
  const bucket = new Map<string, OrdinanceInfoRow>();

  const add = (row: Omit<OrdinanceInfoRow, "id"> & { id?: string }) => pushRow(bucket, row);

  if (parsed.sido && parsed.sigungu) {
    const registry = findRegulationSources(parsed.sido, parsed.sigungu);
    if (registry?.sources) {
      for (const source of registry.sources) {
        if (source.status === "not_started" && !source.sourceUrl && !source.openapiMst) continue;
        const { url, originLabel } = resolveOfficialUrl({
          sourceUrl: source.sourceUrl,
          openapiMst: source.openapiMst,
          sourceOrigin: source.sourceOrigin,
          name: source.name,
        });
        add({
          kind: mapSourceTypeToKind(source.type),
          name: source.name,
          revisedAt: formatDate(source.collectedAt),
          sourceUrl: url,
          sourceOriginLabel: originLabel,
          priority:
            scoreOrdinanceName(source.name, source.type) +
            (source.collectionMethod === "openapi" ? 5 : 0),
        });
      }
    }

    if (shouldIncludeSidoOrdinance(parsed.sido, parsed.sigungu)) {
      const sidoName = sidoPlanningOrdinanceName(parsed.sido);
      const { url, originLabel } = resolveOfficialUrl({ name: sidoName });
      add({
        kind: "조례",
        name: sidoName,
        revisedAt: null,
        sourceUrl: url,
        sourceOriginLabel: originLabel,
        priority: 70,
      });
    }
  }

  const manual = lookupManualOverride(address, jibunAddress);
  if (manual) {
    const { url, originLabel } = resolveOfficialUrl({
      sourceUrl: manual.sourceUrl,
      name: manual.source,
    });
    add({
      kind: "조례",
      name: manual.source,
      revisedAt: formatDate(manual.verifiedAt),
      sourceUrl: url,
      sourceOriginLabel: originLabel,
      priority: 95,
    });
  }

  const rawCandidate = lookupParsedCandidate(address, jibunAddress);
  const candidate = rawCandidate ? enrichCandidateForDisplay(rawCandidate) : null;
  if (candidate) {
    const { url, originLabel } = resolveOfficialUrl({
      sourceUrl: candidate.sourceUrl,
      openapiMst: candidate.openapiMst,
      sourceOrigin: candidate.sourceOrigin,
      name: candidate.ordinanceName,
    });
    add({
      kind: "조례",
      name: candidate.ordinanceName,
      revisedAt: formatDate(candidate.parsedAt),
      sourceUrl: url,
      sourceOriginLabel:
        candidate.sourceCollectionMethod === "openapi" ? "Open API · ELIS" : originLabel,
      priority:
        scoreOrdinanceName(candidate.ordinanceName, "ordinance") +
        (candidate.sourceCollectionMethod === "openapi" ? 8 : 0),
    });
  }

  if (legacyReview?.ordinanceTitle) {
    const { url, originLabel } = resolveOfficialUrl({
      sourceUrl: legacyReview.ordinanceUrl,
      name: legacyReview.ordinanceTitle,
    });
    add({
      kind: "조례",
      name: legacyReview.ordinanceTitle,
      revisedAt: formatDate(legacyReview.promulgatedDate ?? legacyReview.enforcedDate),
      sourceUrl: url,
      sourceOriginLabel: originLabel,
      priority: scoreOrdinanceName(legacyReview.ordinanceTitle, "ordinance"),
    });
  }

  for (const card of display?.cards ?? []) {
    const { url, originLabel } = resolveOfficialUrl({
      sourceUrl: card.sourceUrl,
      name: card.ordinanceName,
    });
    add({
      kind: "조례",
      name: card.ordinanceName,
      revisedAt: formatDate(display?.parsedAt ?? display?.manualVerifiedAt),
      sourceUrl: url,
      sourceOriginLabel: originLabel,
      priority: scoreOrdinanceName(card.ordinanceName, "ordinance") + 3,
    });
  }

  const rows = [...bucket.values()]
    .sort((a, b) => b.priority - a.priority || a.name.localeCompare(b.name, "ko"))
    .slice(0, MAX_ROWS);

  return {
    rows,
    municipalityLabel,
    hasOfficialLinks: rows.some((row) => Boolean(row.sourceUrl)),
  };
}
