import type { MunicipalityOrdinanceData } from "@/types/regulatoryReview";
import buanOrdinance from "@/data/ordinances/buan.json";
import defaultOrdinance from "@/data/ordinances/_default.json";
import eumseongOrdinance from "@/data/ordinances/eumseong.json";
import gunsanOrdinance from "@/data/ordinances/gunsan.json";
import jeonjuOrdinance from "@/data/ordinances/jeonju.json";

const ORDINANCE_REGISTRY: Record<string, MunicipalityOrdinanceData> = {
  _default: defaultOrdinance as MunicipalityOrdinanceData,
  jeonju: jeonjuOrdinance as MunicipalityOrdinanceData,
  eumseong: eumseongOrdinance as MunicipalityOrdinanceData,
  gunsan: gunsanOrdinance as MunicipalityOrdinanceData,
  buan: buanOrdinance as MunicipalityOrdinanceData,
};

const MUNICIPALITY_SLUG_MAP: Record<string, string> = {
  전주시: "jeonju",
  음성군: "eumseong",
  군산시: "gunsan",
  부안군: "buan",
};

export function extractMunicipalityLabel(address: string): string {
  const trimmed = address.trim();
  const cityMatch = trimmed.match(/([^\s]+(?:시|군))\s/);
  if (cityMatch?.[1]) return cityMatch[1];
  const districtMatch = trimmed.match(/([^\s]+구)\s/);
  if (districtMatch?.[1]) return districtMatch[1];
  return "해당 지자체";
}

export function municipalityToSlug(label: string): string {
  return MUNICIPALITY_SLUG_MAP[label] ?? "_default";
}

export function loadMunicipalityOrdinance(address: string): MunicipalityOrdinanceData {
  const label = extractMunicipalityLabel(address);
  const slug = municipalityToSlug(label);
  const data = ORDINANCE_REGISTRY[slug] ?? ORDINANCE_REGISTRY._default;

  if (slug === "_default" && label !== "해당 지자체") {
    return {
      ...data,
      municipalityLabel: label,
      ordinanceTitle: `${label} 도시·군계획 조례`,
    };
  }

  return data;
}

export function listOrdinanceSlugs(): string[] {
  return Object.keys(ORDINANCE_REGISTRY).filter((key) => key !== "_default");
}
