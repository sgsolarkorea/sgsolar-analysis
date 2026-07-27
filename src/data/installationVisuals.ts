export type InstallVisualType =
  | "ground"
  | "factory"
  | "warehouse"
  | "residential"
  | "carport"
  | "building";

export type InstallVisualUsage = "technical" | "proof_featured" | "proof_supporting";

export interface InstallVisualAsset {
  id: string;
  src: string;
  type: InstallVisualType;
  orientation: "landscape";
  aspectRatio: "16:9";
  subject: string;
  quality: "high";
  source: "curated";
  recommendedUsage: InstallVisualUsage[];
  label: string;
  alt: string;
}

const VISUAL_ASSETS: InstallVisualAsset[] = [
  {
    id: "ground-a",
    src: "/install-visuals/ground.svg",
    type: "ground",
    orientation: "landscape",
    aspectRatio: "16:9",
    subject: "토지형 발전소 전경 A",
    quality: "high",
    source: "curated",
    recommendedUsage: ["technical", "proof_featured"],
    label: "토지형",
    alt: "토지형 태양광 설치 형태 예시",
  },
  {
    id: "ground-b",
    src: "/install-visuals/ground-alt.svg",
    type: "ground",
    orientation: "landscape",
    aspectRatio: "16:9",
    subject: "토지형 발전소 전경 B",
    quality: "high",
    source: "curated",
    recommendedUsage: ["technical", "proof_featured", "proof_supporting"],
    label: "토지형",
    alt: "토지형 태양광 설치 형태 예시",
  },
  {
    id: "factory-a",
    src: "/install-visuals/factory-roof.svg",
    type: "factory",
    orientation: "landscape",
    aspectRatio: "16:9",
    subject: "공장 지붕형 태양광",
    quality: "high",
    source: "curated",
    recommendedUsage: ["technical", "proof_supporting"],
    label: "공장 지붕형",
    alt: "공장 지붕형 태양광 설치 형태 예시",
  },
  {
    id: "warehouse-a",
    src: "/install-visuals/warehouse-roof.svg",
    type: "warehouse",
    orientation: "landscape",
    aspectRatio: "16:9",
    subject: "창고 지붕형 태양광",
    quality: "high",
    source: "curated",
    recommendedUsage: ["technical", "proof_supporting"],
    label: "창고 지붕형",
    alt: "창고 지붕형 태양광 설치 형태 예시",
  },
  {
    id: "building-a",
    src: "/install-visuals/building-roof.svg",
    type: "building",
    orientation: "landscape",
    aspectRatio: "16:9",
    subject: "건축물 지붕형 태양광 A",
    quality: "high",
    source: "curated",
    recommendedUsage: ["technical", "proof_featured", "proof_supporting"],
    label: "건축물 지붕형",
    alt: "건축물 지붕형 태양광 설치 형태 예시",
  },
  {
    id: "residential-a",
    src: "/install-visuals/residential.svg",
    type: "residential",
    orientation: "landscape",
    aspectRatio: "16:9",
    subject: "주택 지붕형 태양광 A",
    quality: "high",
    source: "curated",
    recommendedUsage: ["technical", "proof_supporting"],
    label: "주택 지붕형",
    alt: "주택 지붕형 태양광 설치 형태 예시",
  },
  {
    id: "residential-b",
    src: "/install-visuals/residential-alt.svg",
    type: "residential",
    orientation: "landscape",
    aspectRatio: "16:9",
    subject: "주택 지붕형 태양광 B",
    quality: "high",
    source: "curated",
    recommendedUsage: ["proof_supporting"],
    label: "주택 지붕형",
    alt: "주택 지붕형 태양광 설치 형태 예시",
  },
  {
    id: "carport-a",
    src: "/install-visuals/carport.svg",
    type: "carport",
    orientation: "landscape",
    aspectRatio: "16:9",
    subject: "주차장 캐노피형 태양광",
    quality: "high",
    source: "curated",
    recommendedUsage: ["technical", "proof_supporting"],
    label: "주차장형",
    alt: "주차장형 태양광 설치 형태 예시",
  },
];

function normalizeInstallType(installType: string): InstallVisualType {
  const t = installType || "";
  if (t.includes("토지") || t.includes("노지")) return "ground";
  if (t.includes("주차") || t.includes("캐노피") || t.includes("카포트")) return "carport";
  if (t.includes("공장")) return "factory";
  if (t.includes("창고")) return "warehouse";
  if (t.includes("상계") || t.includes("가정") || t.includes("주택")) return "residential";
  if (t.includes("축사") || t.includes("지붕") || t.includes("상가") || t.includes("건축")) return "building";
  return "building";
}

function stableHash(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function pickDeterministic<T>(items: T[], seed: string, offset = 0): T | null {
  if (!items.length) return null;
  const idx = (stableHash(seed) + offset) % items.length;
  return items[idx] ?? null;
}

export function listInstallVisualAssets(): InstallVisualAsset[] {
  return VISUAL_ASSETS;
}

export function resolveInstallVisual(
  installType: string,
  options?: {
    usage?: InstallVisualUsage;
    seed?: string;
    excludeSrcs?: string[];
  },
): InstallVisualAsset {
  const type = normalizeInstallType(installType);
  const usage = options?.usage ?? "technical";
  const excludeSrcs = new Set(options?.excludeSrcs ?? []);
  const seed = options?.seed ?? installType ?? "seed";

  const primaryPool = VISUAL_ASSETS.filter(
    (asset) =>
      asset.type === type &&
      asset.recommendedUsage.includes(usage) &&
      !excludeSrcs.has(asset.src),
  );
  const fallbackTypePool = VISUAL_ASSETS.filter(
    (asset) => asset.type === type && !excludeSrcs.has(asset.src),
  );
  const genericPool = VISUAL_ASSETS.filter((asset) => !excludeSrcs.has(asset.src));

  return (
    pickDeterministic(primaryPool, `${seed}:${type}:${usage}`) ??
    pickDeterministic(fallbackTypePool, `${seed}:${type}:fallback`) ??
    pickDeterministic(genericPool, `${seed}:generic`) ??
    VISUAL_ASSETS[0]
  );
}

export function resolveInstallVisualForLookbook(
  type: InstallVisualType,
  options?: {
    usage?: InstallVisualUsage;
    seed?: string;
    excludeSrcs?: string[];
  },
): InstallVisualAsset {
  return resolveInstallVisual(type, options);
}
