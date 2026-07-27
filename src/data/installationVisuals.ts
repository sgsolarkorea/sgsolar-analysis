export type InstallVisualKey = "ground" | "building" | "residential";

export interface InstallVisualConfig {
  key: InstallVisualKey;
  label: string;
  src: string;
  alt: string;
}

const VISUALS: Record<InstallVisualKey, InstallVisualConfig> = {
  ground: {
    key: "ground",
    label: "토지형",
    src: "/install-visuals/ground.svg",
    alt: "토지형 태양광 설치 형태 예시",
  },
  building: {
    key: "building",
    label: "건축물 지붕형",
    src: "/install-visuals/building-roof.svg",
    alt: "건축물 지붕형 태양광 설치 형태 예시",
  },
  residential: {
    key: "residential",
    label: "주택 지붕형",
    src: "/install-visuals/residential.svg",
    alt: "주택 지붕형 태양광 설치 형태 예시",
  },
};

/** Map canonical install type → visual (설치 형태 예시, not a site photo). */
export function resolveInstallVisual(installType: string): InstallVisualConfig {
  if (installType.includes("토지")) return VISUALS.ground;
  if (installType.includes("상계") || installType.includes("가정")) return VISUALS.residential;
  return VISUALS.building;
}
