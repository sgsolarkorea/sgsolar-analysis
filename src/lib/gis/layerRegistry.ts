import type { GisLayerGroup } from "@/types/siteIntel";

export type LayerRegistryPhase = "step1" | "step2" | "step3";

export interface GisLayerDefinition {
  id: string;
  name: string;
  group: GisLayerGroup;
  enabled: boolean;
  phase: LayerRegistryPhase;
  /** Step 2+ intersect 대상 */
  forIntersect: boolean;
  /** Step 3+ setback nearest 대상 */
  forSetback: boolean;
  regulatoryCategory?: string;
}

/** P0 core layer registry — Step 1은 정의만, Step 2~3에서 활성 사용 */
export const GIS_LAYER_REGISTRY: GisLayerDefinition[] = [
  // 용도지역
  { id: "LT_C_UQ111", name: "도시지역", group: "zoning", enabled: true, phase: "step2", forIntersect: true, forSetback: false },
  { id: "LT_C_UQ112", name: "관리지역", group: "zoning", enabled: true, phase: "step2", forIntersect: true, forSetback: false },
  { id: "LT_C_UQ113", name: "농림지역", group: "zoning", enabled: true, phase: "step2", forIntersect: true, forSetback: false },
  { id: "LT_C_UQ114", name: "자연환경보전지역", group: "zoning", enabled: true, phase: "step2", forIntersect: true, forSetback: false },
  // 용도지구·구역
  { id: "LT_C_UQ121", name: "용도지구", group: "district", enabled: true, phase: "step2", forIntersect: true, forSetback: false },
  { id: "LT_C_UQ122", name: "용도지구(상세)", group: "district", enabled: true, phase: "step2", forIntersect: true, forSetback: false },
  { id: "LT_C_UD801", name: "개발제한구역", group: "restriction", enabled: true, phase: "step2", forIntersect: true, forSetback: false, regulatoryCategory: "개발제한" },
  { id: "LT_C_UQ162", name: "토지거래허가구역", group: "restriction", enabled: true, phase: "step2", forIntersect: true, forSetback: false },
  // Layer A — 다른 법령
  { id: "LT_C_AGRIXUE", name: "농지", group: "restriction", enabled: true, phase: "step2", forIntersect: true, forSetback: false, regulatoryCategory: "농지" },
  { id: "LT_C_UF010", name: "산림", group: "restriction", enabled: true, phase: "step2", forIntersect: true, forSetback: false, regulatoryCategory: "산지" },
  { id: "LT_C_UO301", name: "문화재보호", group: "cultural", enabled: true, phase: "step2", forIntersect: true, forSetback: true, regulatoryCategory: "문화재" },
  { id: "LT_C_UB001", name: "군사시설보호", group: "restriction", enabled: true, phase: "step2", forIntersect: true, forSetback: false, regulatoryCategory: "군사" },
  // 이격거리 MVP (Step 3)
  { id: "LT_C_UPISUQ151", name: "도시계획(도로)", group: "road", enabled: true, phase: "step3", forIntersect: false, forSetback: true },
  { id: "LT_L_CHRN", name: "하천", group: "river", enabled: true, phase: "step3", forIntersect: false, forSetback: true },
  { id: "LT_C_SPBD", name: "건물", group: "building", enabled: true, phase: "step3", forIntersect: false, forSetback: true },
  { id: "LT_C_AISBG", name: "GIS건물통합", group: "building", enabled: false, phase: "step3", forIntersect: false, forSetback: true },
];

export function getEnabledLayers(filter?: {
  phase?: LayerRegistryPhase;
  forIntersect?: boolean;
  forSetback?: boolean;
}): GisLayerDefinition[] {
  return GIS_LAYER_REGISTRY.filter((layer) => {
    if (!layer.enabled) return false;
    if (filter?.phase && layer.phase !== filter.phase) return false;
    if (filter?.forIntersect === true && !layer.forIntersect) return false;
    if (filter?.forSetback === true && !layer.forSetback) return false;
    return true;
  });
}
