import type { LatLngPoint } from "@/types/moduleLayout";
import {
  applyNarrowZonePolicy,
  type NarrowZoneDiagnostics,
} from "@/lib/solar/narrowZonePolicy";
import { polygonAreaSqm } from "@/lib/solar/polygonGeometry";

export function finalizeLandLayoutBoundary(input: {
  setbackBoundary: LatLngPoint[];
  unionComponentCount?: number;
  narrowZoneEnabled?: boolean;
}): {
  layoutBoundary: LatLngPoint[];
  landUsableAreaSqm: number;
  narrowZone: NarrowZoneDiagnostics;
} {
  const setbackArea = input.setbackBoundary.length >= 3 ? polygonAreaSqm(input.setbackBoundary) : 0;
  if (input.setbackBoundary.length < 3) {
    return {
      layoutBoundary: input.setbackBoundary,
      landUsableAreaSqm: setbackArea,
      narrowZone: {
        narrowZonePolicyApplied: false,
        unionComponentCount: input.unionComponentCount ?? 1,
        usableComponentCount: 0,
        selectedComponentAreaSqm: setbackArea,
        excludedComponentAreaSqm: 0,
        excludedNarrowAreaSqm: 0,
        narrowZoneReason: "not_applied_insufficient_polygon",
        narrowWidthThresholdM: 6,
        setbackUsableAreaSqm: setbackArea,
      },
    };
  }

  return applyNarrowZonePolicy(input.setbackBoundary, {
    unionComponentCount: input.unionComponentCount ?? 1,
    enabled: input.narrowZoneEnabled,
  });
}
