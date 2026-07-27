export type InstallVisualKey =
  | "ground"
  | "building"
  | "residential"
  | "warehouse"
  | "factory"
  | "carport";

export interface InstallVisualConfig {
  key: InstallVisualKey;
  label: string;
  src: string;
  alt: string;
  /** Internal asset provenance (not shown in UI) */
  sourceType: "companyProfile" | "fallback";
  sourcePage?: number;
}

const VISUALS: Record<InstallVisualKey, InstallVisualConfig> = {
  ground: {
    key: "ground",
    label: "토지형",
    src: "/install-visuals/ground.webp",
    alt: "토지형 태양광 설치 형태 예시",
    sourceType: "companyProfile",
    sourcePage: 18,
  },
  building: {
    key: "building",
    label: "건축물 지붕형",
    src: "/install-visuals/building-roof.webp",
    alt: "건축물 지붕형 태양광 설치 형태 예시",
    sourceType: "companyProfile",
    sourcePage: 13,
  },
  warehouse: {
    key: "warehouse",
    label: "창고 지붕형",
    src: "/install-visuals/warehouse.webp",
    alt: "창고 지붕형 태양광 설치 형태 예시",
    sourceType: "companyProfile",
    sourcePage: 48,
  },
  factory: {
    key: "factory",
    label: "공장 지붕형",
    src: "/install-visuals/factory.webp",
    alt: "공장 지붕형 태양광 설치 형태 예시",
    sourceType: "companyProfile",
    sourcePage: 48,
  },
  residential: {
    key: "residential",
    label: "주택 지붕형",
    src: "/install-visuals/residential.webp",
    alt: "주택 지붕형 태양광 설치 형태 예시",
    sourceType: "companyProfile",
    sourcePage: 8,
  },
  carport: {
    key: "carport",
    label: "주차장형",
    src: "/install-visuals/carport.webp",
    alt: "주차장형 태양광 설치 형태 예시",
    sourceType: "companyProfile",
    sourcePage: 48,
  },
};

const FALLBACK: InstallVisualConfig = {
  key: "building",
  label: "설치 형태 예시",
  src: "/install-visuals/building-roof.webp",
  alt: "태양광 설치 형태 예시",
  sourceType: "fallback",
};

/** Map canonical install type / category → visual (설치 형태 예시). */
export function resolveInstallVisual(installType: string): InstallVisualConfig {
  const t = installType || "";
  if (t.includes("토지") || t.includes("노지")) return VISUALS.ground;
  if (t.includes("주차") || t.includes("캐노피") || t.includes("카포트")) return VISUALS.carport;
  if (t.includes("공장")) return VISUALS.factory;
  if (t.includes("창고")) return VISUALS.warehouse;
  if (t.includes("상계") || t.includes("가정") || t.includes("주택")) return VISUALS.residential;
  if (t.includes("축사") || t.includes("지붕") || t.includes("공장") || t.includes("상가")) {
    return VISUALS.building;
  }
  return VISUALS.building.src ? VISUALS.building : FALLBACK;
}

export function getInstallVisualOrFallback(key: InstallVisualKey): InstallVisualConfig {
  return VISUALS[key] ?? FALLBACK;
}
