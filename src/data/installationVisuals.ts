export type InstallVisualType =
  | "ground"
  | "factory"
  | "warehouse"
  | "residential"
  | "carport"
  | "building";

export type InstallVisualRole =
  | "technicalHero"
  | "proofFeatured"
  | "proofSupporting"
  | "detail";

export type InstallVisualUsage = "technical" | "proof_featured" | "proof_supporting";

export type InstallVisualAssetId =
  | "GROUND_AERIAL_01"
  | "GROUND_AERIAL_02"
  | "GROUND_DETAIL_01"
  | "FACTORY_ROOF_01"
  | "WAREHOUSE_ROOF_01"
  | "RESIDENTIAL_ROOF_01"
  | "RESIDENTIAL_ROOF_02"
  | "CARPORT_HOME_01"
  | "CARPORT_COMMERCIAL_01"
  | "SOLAR_DETAIL_01";

export interface InstallVisualAsset {
  id: InstallVisualAssetId;
  src: string;
  type: InstallVisualType;
  role: InstallVisualRole[];
  orientation: "landscape" | "portrait";
  aspectRatio: "16:9" | "4:3";
  priority: number;
  quality: "high";
  usage: InstallVisualUsage[];
  label: string;
  alt: string;
  width: number;
  height: number;
}

const VISUAL_ASSETS: InstallVisualAsset[] = [
  {
    id: "GROUND_AERIAL_01",
    src: "/install-visuals/ground-aerial-01.webp",
    type: "ground",
    role: ["technicalHero", "proofSupporting"],
    orientation: "landscape",
    aspectRatio: "16:9",
    priority: 1,
    quality: "high",
    usage: ["technical", "proof_supporting"],
    label: "토지형",
    alt: "토지형 태양광 설치 형태 예시",
    width: 1536,
    height: 1024,
  },
  {
    id: "GROUND_AERIAL_02",
    src: "/install-visuals/ground-aerial-02.webp",
    type: "ground",
    role: ["proofFeatured", "proofSupporting"],
    orientation: "landscape",
    aspectRatio: "16:9",
    priority: 2,
    quality: "high",
    usage: ["proof_featured", "proof_supporting"],
    label: "토지형",
    alt: "토지형 태양광 설치 형태 예시",
    width: 1536,
    height: 1024,
  },
  {
    id: "GROUND_DETAIL_01",
    src: "/install-visuals/ground-detail-01.webp",
    type: "ground",
    role: ["detail"],
    orientation: "landscape",
    aspectRatio: "4:3",
    priority: 3,
    quality: "high",
    usage: ["proof_supporting"],
    label: "토지형",
    alt: "토지형 태양광 설치 형태 예시",
    width: 1200,
    height: 800,
  },
  {
    id: "FACTORY_ROOF_01",
    src: "/install-visuals/factory-roof-01.webp",
    type: "factory",
    role: ["technicalHero", "proofSupporting"],
    orientation: "landscape",
    aspectRatio: "16:9",
    priority: 1,
    quality: "high",
    usage: ["technical", "proof_supporting"],
    label: "공장 지붕형",
    alt: "공장 지붕형 태양광 설치 형태 예시",
    width: 1536,
    height: 1024,
  },
  {
    id: "WAREHOUSE_ROOF_01",
    src: "/install-visuals/warehouse-roof-01.webp",
    type: "warehouse",
    role: ["technicalHero", "proofSupporting"],
    orientation: "landscape",
    aspectRatio: "4:3",
    priority: 2,
    quality: "high",
    usage: ["technical", "proof_supporting"],
    label: "창고 지붕형",
    alt: "창고 지붕형 태양광 설치 형태 예시",
    width: 1200,
    height: 800,
  },
  {
    id: "RESIDENTIAL_ROOF_01",
    src: "/install-visuals/residential-roof-01.webp",
    type: "residential",
    role: ["technicalHero", "proofSupporting"],
    orientation: "landscape",
    aspectRatio: "4:3",
    priority: 1,
    quality: "high",
    usage: ["technical", "proof_supporting"],
    label: "주택 지붕형",
    alt: "주택 지붕형 태양광 설치 형태 예시",
    width: 1200,
    height: 800,
  },
  {
    id: "RESIDENTIAL_ROOF_02",
    src: "/install-visuals/residential-roof-02.webp",
    type: "residential",
    role: ["proofFeatured"],
    orientation: "landscape",
    aspectRatio: "4:3",
    priority: 2,
    quality: "high",
    usage: ["proof_featured"],
    label: "주택 지붕형",
    alt: "주택 지붕형 태양광 설치 형태 예시",
    width: 1200,
    height: 800,
  },
  {
    id: "CARPORT_HOME_01",
    src: "/install-visuals/carport-home-01.webp",
    type: "carport",
    role: ["technicalHero", "proofSupporting"],
    orientation: "landscape",
    aspectRatio: "4:3",
    priority: 1,
    quality: "high",
    usage: ["technical", "proof_supporting"],
    label: "주차장형",
    alt: "주차장형 태양광 설치 형태 예시",
    width: 1200,
    height: 800,
  },
  {
    id: "CARPORT_COMMERCIAL_01",
    src: "/install-visuals/carport-commercial-01.webp",
    type: "carport",
    role: ["proofFeatured", "technicalHero"],
    orientation: "landscape",
    aspectRatio: "16:9",
    priority: 2,
    quality: "high",
    usage: ["proof_featured", "technical"],
    label: "주차장형",
    alt: "주차장형 태양광 설치 형태 예시",
    width: 1536,
    height: 1024,
  },
  {
    id: "SOLAR_DETAIL_01",
    src: "/install-visuals/solar-detail-01.webp",
    type: "building",
    role: ["detail"],
    orientation: "landscape",
    aspectRatio: "4:3",
    priority: 1,
    quality: "high",
    usage: ["proof_supporting"],
    label: "설비 디테일",
    alt: "태양광 설비 설치 형태 예시",
    width: 1200,
    height: 800,
  },
];

export type InstallVisualCategory = "ground" | "building" | "residential" | "carport";

function normalizeCategory(installType: string): InstallVisualCategory {
  const t = installType || "";
  if (t.includes("주차") || t.includes("캐노피") || t.includes("카포트")) return "carport";
  if (t.includes("상계") || t.includes("가정") || t.includes("주택")) return "residential";
  if (t.includes("토지") || t.includes("노지")) return "ground";
  return "building";
}

function isWarehouseType(installType: string): boolean {
  const t = installType || "";
  return t.includes("창고") || t.includes("물류");
}

function byId(id: InstallVisualAssetId): InstallVisualAsset {
  const asset = VISUAL_ASSETS.find((a) => a.id === id);
  if (!asset) throw new Error(`Missing visual asset: ${id}`);
  return asset;
}

function uniqueAssets(ids: InstallVisualAssetId[]): InstallVisualAsset[] {
  const seen = new Set<string>();
  return ids
    .map((id) => byId(id))
    .filter((asset) => {
      if (seen.has(asset.id)) return false;
      seen.add(asset.id);
      return true;
    });
}

export interface InstallVisualSet {
  technical: InstallVisualAsset;
  proofFeatured: InstallVisualAsset;
  proofSupporting: InstallVisualAsset[];
}

export function resolveInstallVisualSet(installType: string): InstallVisualSet {
  const category = normalizeCategory(installType);

  if (category === "ground") {
    return {
      technical: byId("GROUND_AERIAL_01"),
      proofFeatured: byId("GROUND_AERIAL_02"),
      proofSupporting: uniqueAssets([
        "FACTORY_ROOF_01",
        "RESIDENTIAL_ROOF_01",
        "CARPORT_HOME_01",
      ]),
    };
  }

  if (category === "residential") {
    return {
      technical: byId("RESIDENTIAL_ROOF_01"),
      proofFeatured: byId("RESIDENTIAL_ROOF_02"),
      proofSupporting: uniqueAssets([
        "CARPORT_HOME_01",
        "FACTORY_ROOF_01",
        "GROUND_AERIAL_01",
      ]),
    };
  }

  if (category === "carport") {
    const commercial = installType.includes("상업") || installType.includes("사업");
    return {
      technical: commercial ? byId("CARPORT_COMMERCIAL_01") : byId("CARPORT_HOME_01"),
      proofFeatured: commercial ? byId("CARPORT_HOME_01") : byId("CARPORT_COMMERCIAL_01"),
      proofSupporting: uniqueAssets([
        "RESIDENTIAL_ROOF_01",
        "FACTORY_ROOF_01",
        "GROUND_AERIAL_01",
      ]),
    };
  }

  const technicalId: InstallVisualAssetId = isWarehouseType(installType)
    ? "WAREHOUSE_ROOF_01"
    : "FACTORY_ROOF_01";
  const featuredId: InstallVisualAssetId =
    technicalId === "FACTORY_ROOF_01" ? "WAREHOUSE_ROOF_01" : "FACTORY_ROOF_01";

  return {
    technical: byId(technicalId),
    proofFeatured: byId(featuredId),
    proofSupporting: uniqueAssets([
      "GROUND_AERIAL_01",
      "RESIDENTIAL_ROOF_01",
      "CARPORT_HOME_01",
    ]),
  };
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

export function getInstallVisualById(id: InstallVisualAssetId): InstallVisualAsset {
  return byId(id);
}

export function resolveInstallVisual(
  installType: string,
  options?: {
    usage?: InstallVisualUsage;
    seed?: string;
    excludeSrcs?: string[];
  },
): InstallVisualAsset {
  const set = resolveInstallVisualSet(installType);
  const usage = options?.usage ?? "technical";
  const excludeSrcs = new Set(options?.excludeSrcs ?? []);

  if (usage === "technical") {
    if (!excludeSrcs.has(set.technical.src)) return set.technical;
  }
  if (usage === "proof_featured") {
    if (!excludeSrcs.has(set.proofFeatured.src)) return set.proofFeatured;
  }
  if (usage === "proof_supporting") {
    const supporting = set.proofSupporting.find((a) => !excludeSrcs.has(a.src));
    if (supporting) return supporting;
  }

  const seed = options?.seed ?? installType ?? "seed";
  const pool = VISUAL_ASSETS.filter((asset) => !excludeSrcs.has(asset.src));
  return (
    pickDeterministic(pool.filter((a) => a.usage.includes(usage)), `${seed}:${usage}`) ??
    pickDeterministic(pool, `${seed}:fallback`) ??
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
  void type;
  return resolveInstallVisual(type, options);
}
