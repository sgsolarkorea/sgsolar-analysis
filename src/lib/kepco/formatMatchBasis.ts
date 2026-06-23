import type {
  KepcoOfficeConfidence,
  KepcoOfficeMatchLevel,
  KepcoOfficeRegistryEntry,
  ParsedKepcoAddress,
} from "@/types/kepco";

function verificationSuffix(confidence: KepcoOfficeConfidence): string {
  if (confidence === "needs_verification") return " · 관할 확인 권장";
  if (confidence === "unknown") return "";
  return "";
}

export function formatMatchBasisLabel(
  entry: Pick<KepcoOfficeRegistryEntry, "matchLevel" | "confidence" | "sido" | "sigungu" | "gu" | "eupmyeon" | "dong">,
  parsed: ParsedKepcoAddress,
): string {
  const suffix = verificationSuffix(entry.confidence);

  switch (entry.matchLevel) {
    case "dong":
      return `${entry.dong ?? parsed.dong ?? "동"} 기준 주소 1차 매칭${suffix}`;
    case "eupmyeon":
      return `${entry.eupmyeon ?? parsed.eupmyeon ?? "읍·면"} 기준 주소 1차 매칭${suffix}`;
    case "gu":
      return `${entry.gu ?? parsed.gu ?? "구"} 기준 주소 1차 매칭${suffix}`;
    case "sigungu":
      return `${entry.sigungu ?? parsed.sigungu ?? "시·군·구"} 기준 주소 1차 매칭${suffix}`;
    case "sido":
      return `${entry.sido ?? parsed.sido ?? "시·도"} 기준 주소 1차 매칭${suffix}`;
    default:
      return "관할 사업소 확인 필요";
  }
}

export const MATCH_LEVEL_SCORE: Record<KepcoOfficeMatchLevel, number> = {
  dong: 6,
  eupmyeon: 5,
  gu: 4,
  sigungu: 3,
  sido: 2,
  unknown: 0,
};

export const CONFIDENCE_SCORE: Record<KepcoOfficeConfidence, number> = {
  verified: 4,
  region_match: 3,
  needs_verification: 2,
  unknown: 1,
};
