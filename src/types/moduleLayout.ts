export interface LatLngPoint {
  lat: number;
  lng: number;
}

export interface ModuleRect {
  corners: [LatLngPoint, LatLngPoint, LatLngPoint, LatLngPoint];
}

export type ModuleLayoutPolygonSource = "cadastral" | "virtual";

export type ModuleLayoutMode = "flush" | "row";

export interface ModuleLayoutStats {
  capacityKw: number;
  targetModuleCount: number;
  placedModuleCount: number;
  modulePowerW: number;
  layoutMode: ModuleLayoutMode;
  tiers: number;
  rowSpacingM: number;
  tiltDeg: number;
  installType: string;
}

export interface ModuleLayoutResult {
  boundary: LatLngPoint[];
  modules: ModuleRect[];
  center: LatLngPoint;
  bounds: {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
  };
  polygonSource: ModuleLayoutPolygonSource;
  stats: ModuleLayoutStats;
}
