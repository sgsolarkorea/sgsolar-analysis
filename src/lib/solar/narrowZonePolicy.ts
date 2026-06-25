import { layoutPolicy, moduleLayoutConfig } from "@/data/moduleLayoutConfig";
import {
  centroid,
  closeRing,
  normalizeRing,
  pointInPolygon,
  polygonAreaSqm,
  toLatLng,
  toLocal,
  type LocalPoint,
} from "@/lib/solar/polygonGeometry";
import type { LatLngPoint } from "@/types/moduleLayout";

export type NarrowZoneReason =
  | "disabled"
  | "not_applied_insufficient_polygon"
  | "not_applied_retained_area_guard"
  | "not_applied_no_narrow_exclusion"
  | "main_component_selected"
  | "narrow_width_filtered";

export interface NarrowZoneDiagnostics {
  narrowZonePolicyApplied: boolean;
  unionComponentCount: number;
  usableComponentCount: number;
  selectedComponentAreaSqm: number;
  excludedComponentAreaSqm: number;
  excludedNarrowAreaSqm: number;
  narrowZoneReason: NarrowZoneReason;
  estimatedMinWidthM?: number;
  minLocalWidthM?: number;
  narrowWidthThresholdM: number;
  setbackUsableAreaSqm: number;
}

export interface NarrowZonePolicyResult {
  layoutBoundary: LatLngPoint[];
  landUsableAreaSqm: number;
  narrowZone: NarrowZoneDiagnostics;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function emptyDiagnostics(
  setbackUsableAreaSqm: number,
  unionComponentCount: number,
  reason: NarrowZoneReason,
): NarrowZoneDiagnostics {
  return {
    narrowZonePolicyApplied: false,
    unionComponentCount,
    usableComponentCount: 1,
    selectedComponentAreaSqm: round2(setbackUsableAreaSqm),
    excludedComponentAreaSqm: 0,
    excludedNarrowAreaSqm: 0,
    narrowZoneReason: reason,
    narrowWidthThresholdM: layoutPolicy.narrowZoneMinWidthM,
    setbackUsableAreaSqm: round2(setbackUsableAreaSqm),
  };
}

interface OccupancyGrid {
  inside: boolean[][];
  minX: number;
  minY: number;
  cellSize: number;
  cols: number;
  rows: number;
}

function buildOccupancyGrid(localPoly: LocalPoint[], cellSize: number): OccupancyGrid | null {
  if (localPoly.length < 3) return null;

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const point of localPoly) {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
  }

  const cols = Math.max(1, Math.ceil((maxX - minX) / cellSize) + 2);
  const rows = Math.max(1, Math.ceil((maxY - minY) / cellSize) + 2);
  const inside: boolean[][] = [];

  for (let row = 0; row < rows; row++) {
    inside[row] = [];
    for (let col = 0; col < cols; col++) {
      const x = minX + (col + 0.5) * cellSize;
      const y = minY + (row + 0.5) * cellSize;
      inside[row][col] = pointInPolygon({ x, y }, localPoly);
    }
  }

  return { inside, minX, minY, cellSize, cols, rows };
}

function computeLocalWidthGrid(grid: OccupancyGrid): number[][] {
  const { inside, rows, cols, cellSize } = grid;
  const dist: number[][] = Array.from({ length: rows }, () => Array(cols).fill(Infinity));
  const queue: Array<[number, number]> = [];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (!inside[row][col]) {
        dist[row][col] = 0;
        continue;
      }

      let isBoundaryCell = false;
      for (const [dr, dc] of [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
      ]) {
        const nr = row + dr;
        const nc = col + dc;
        if (nr < 0 || nr >= rows || nc < 0 || nc >= cols || !inside[nr][nc]) {
          isBoundaryCell = true;
          break;
        }
      }

      if (isBoundaryCell) {
        dist[row][col] = 1;
        queue.push([row, col]);
      }
    }
  }

  for (let i = 0; i < queue.length; i++) {
    const [row, col] = queue[i];
    for (const [dr, dc] of [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ]) {
      const nr = row + dr;
      const nc = col + dc;
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols || !inside[nr][nc]) continue;
      const next = dist[row][col] + 1;
      if (next < dist[nr][nc]) {
        dist[nr][nc] = next;
        queue.push([nr, nc]);
      }
    }
  }

  return dist.map((row, r) =>
    row.map((value, c) => (inside[r][c] ? value * 2 * cellSize : 0)),
  );
}

function cellKey(row: number, col: number): string {
  return `${row},${col}`;
}

function labelComponents(keep: boolean[][]): Array<Set<string>> {
  const rows = keep.length;
  const cols = keep[0]?.length ?? 0;
  const visited = Array.from({ length: rows }, () => Array(cols).fill(false));
  const components: Array<Set<string>> = [];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (!keep[row][col] || visited[row][col]) continue;
      const component = new Set<string>();
      const stack: Array<[number, number]> = [[row, col]];
      visited[row][col] = true;
      component.add(cellKey(row, col));

      while (stack.length > 0) {
        const [cr, cc] = stack.pop()!;
        for (const [dr, dc] of [
          [-1, 0],
          [1, 0],
          [0, -1],
          [0, 1],
        ]) {
          const nr = cr + dr;
          const nc = cc + dc;
          if (nr < 0 || nr >= rows || nc < 0 || nc >= cols || !keep[nr][nc] || visited[nr][nc]) {
            continue;
          }
          visited[nr][nc] = true;
          component.add(cellKey(nr, nc));
          stack.push([nr, nc]);
        }
      }

      if (component.size > 0) components.push(component);
    }
  }

  return components;
}

function componentAreaSqm(component: Set<string>, cellSize: number): number {
  return component.size * cellSize * cellSize;
}

function minWidthInMask(widthGrid: number[][], mask: boolean[][]): number {
  let min = Infinity;
  for (let row = 0; row < mask.length; row++) {
    for (let col = 0; col < (mask[row]?.length ?? 0); col++) {
      if (!mask[row][col]) continue;
      const value = widthGrid[row][col];
      if (value > 0) min = Math.min(min, value);
    }
  }
  return Number.isFinite(min) ? min : 0;
}

function narrowCellAreaSqm(
  widthGrid: number[][],
  inside: boolean[][],
  thresholdM: number,
  cellSize: number,
): number {
  let count = 0;
  for (let row = 0; row < inside.length; row++) {
    for (let col = 0; col < (inside[row]?.length ?? 0); col++) {
      if (!inside[row][col]) continue;
      if (widthGrid[row][col] < thresholdM) count++;
    }
  }
  return count * cellSize * cellSize;
}

function pointsClose(a: LocalPoint, b: LocalPoint, tolerance = 1e-4): boolean {
  return Math.abs(a.x - b.x) <= tolerance && Math.abs(a.y - b.y) <= tolerance;
}

function undirectedSegmentKey(a: LocalPoint, b: LocalPoint): string {
  const ax = round2(a.x);
  const ay = round2(a.y);
  const bx = round2(b.x);
  const by = round2(b.y);
  return ax < bx || (ax === bx && ay <= by) ? `${ax},${ay}|${bx},${by}` : `${bx},${by}|${ax},${ay}`;
}

function componentBoundingPolygon(component: Set<string>, grid: OccupancyGrid): LocalPoint[] {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const key of component) {
    const [row, col] = key.split(",").map(Number);
    const left = grid.minX + col * grid.cellSize;
    const bottom = grid.minY + row * grid.cellSize;
    const right = left + grid.cellSize;
    const top = bottom + grid.cellSize;
    minX = Math.min(minX, left);
    maxX = Math.max(maxX, right);
    minY = Math.min(minY, bottom);
    maxY = Math.max(maxY, top);
  }

  if (!Number.isFinite(minX)) return [];
  return [
    { x: minX, y: minY },
    { x: maxX, y: minY },
    { x: maxX, y: maxY },
    { x: minX, y: maxY },
  ];
}

function componentToLocalPolygon(component: Set<string>, grid: OccupancyGrid): LocalPoint[] {
  const edgeCount = new Map<string, number>();
  const edgeSegments = new Map<string, [LocalPoint, LocalPoint]>();

  for (const key of component) {
    const [row, col] = key.split(",").map(Number);
    const left = grid.minX + col * grid.cellSize;
    const bottom = grid.minY + row * grid.cellSize;
    const right = left + grid.cellSize;
    const top = bottom + grid.cellSize;

    const sides: Array<[LocalPoint, LocalPoint, number, number]> = [
      [{ x: left, y: top }, { x: right, y: top }, row - 1, col],
      [{ x: right, y: top }, { x: right, y: bottom }, row, col + 1],
      [{ x: right, y: bottom }, { x: left, y: bottom }, row + 1, col],
      [{ x: left, y: bottom }, { x: left, y: top }, row, col - 1],
    ];

    for (const [start, end, nr, nc] of sides) {
      const neighborInside =
        nr >= 0 &&
        nr < grid.rows &&
        nc >= 0 &&
        nc < grid.cols &&
        component.has(cellKey(nr, nc));
      if (neighborInside) continue;
      const segmentKey = undirectedSegmentKey(start, end);
      edgeCount.set(segmentKey, (edgeCount.get(segmentKey) ?? 0) + 1);
      edgeSegments.set(segmentKey, [start, end]);
    }
  }

  const boundaryEdges: Array<[LocalPoint, LocalPoint]> = [];
  for (const [key, count] of edgeCount) {
    if (count === 1) {
      const segment = edgeSegments.get(key);
      if (segment) boundaryEdges.push(segment);
    }
  }

  if (boundaryEdges.length === 0) {
    return componentBoundingPolygon(component, grid);
  }

  const loop: LocalPoint[] = [boundaryEdges[0][0], boundaryEdges[0][1]];
  boundaryEdges.splice(0, 1);

  let guard = 0;
  while (boundaryEdges.length > 0 && guard++ < boundaryEdges.length + 8) {
    const last = loop[loop.length - 1];
    const idx = boundaryEdges.findIndex(([a, b]) => pointsClose(a, last) || pointsClose(b, last));
    if (idx < 0) break;
    const [a, b] = boundaryEdges[idx];
    boundaryEdges.splice(idx, 1);
    loop.push(pointsClose(a, last) ? b : a);
    if (pointsClose(loop[loop.length - 1], loop[0])) {
      loop.pop();
      break;
    }
  }

  if (loop.length >= 3) {
    const gridArea = componentAreaSqm(component, grid.cellSize);
    let area = 0;
    for (let i = 0; i < loop.length; i++) {
      const j = (i + 1) % loop.length;
      area += loop[i].x * loop[j].y - loop[j].x * loop[i].y;
    }
    area = Math.abs(area) / 2;
    if (area >= gridArea * 0.45) return loop;
  }

  return componentBoundingPolygon(component, grid);
}

/** setback polygon → narrow zone 분석 → layout boundary (1차: main component only) */
export function applyNarrowZonePolicy(
  setbackBoundary: LatLngPoint[],
  input?: {
    unionComponentCount?: number;
    enabled?: boolean;
    widthThresholdM?: number;
  },
): NarrowZonePolicyResult {
  const ring = closeRing(normalizeRing(setbackBoundary));
  const setbackUsableAreaSqm = polygonAreaSqm(ring);
  const unionComponentCount = input?.unionComponentCount ?? 1;
  const enabled = input?.enabled ?? layoutPolicy.narrowZonePolicyEnabled;
  const widthThresholdM = input?.widthThresholdM ?? layoutPolicy.narrowZoneMinWidthM;
  const cellSize = layoutPolicy.narrowZoneGridCellSizeM;

  if (!enabled || ring.length < 3) {
    return {
      layoutBoundary: ring,
      landUsableAreaSqm: round2(setbackUsableAreaSqm),
      narrowZone: emptyDiagnostics(
        setbackUsableAreaSqm,
        unionComponentCount,
        enabled ? "not_applied_insufficient_polygon" : "disabled",
      ),
    };
  }

  const origin = centroid(ring);
  const localPoly = toLocal(ring, origin);
  const grid = buildOccupancyGrid(localPoly, cellSize);
  if (!grid) {
    return {
      layoutBoundary: ring,
      landUsableAreaSqm: round2(setbackUsableAreaSqm),
      narrowZone: emptyDiagnostics(
        setbackUsableAreaSqm,
        unionComponentCount,
        "not_applied_insufficient_polygon",
      ),
    };
  }

  const widthGrid = computeLocalWidthGrid(grid);
  const estimatedMinWidthM = round2(minWidthInMask(widthGrid, grid.inside));
  const excludedNarrowAreaSqm = round2(
    narrowCellAreaSqm(widthGrid, grid.inside, widthThresholdM, cellSize),
  );

  const connectedComponents = labelComponents(grid.inside);
  const usableComponentCount = connectedComponents.length;

  if (usableComponentCount <= 1) {
    return {
      layoutBoundary: ring,
      landUsableAreaSqm: round2(setbackUsableAreaSqm),
      narrowZone: {
        narrowZonePolicyApplied: false,
        unionComponentCount,
        usableComponentCount: Math.max(1, usableComponentCount),
        selectedComponentAreaSqm: round2(setbackUsableAreaSqm),
        excludedComponentAreaSqm: 0,
        excludedNarrowAreaSqm,
        narrowZoneReason: "not_applied_no_narrow_exclusion",
        estimatedMinWidthM,
        minLocalWidthM: estimatedMinWidthM,
        narrowWidthThresholdM: widthThresholdM,
        setbackUsableAreaSqm: round2(setbackUsableAreaSqm),
      },
    };
  }

  const largestComponent = connectedComponents.reduce((best, component) =>
    componentAreaSqm(component, cellSize) > componentAreaSqm(best, cellSize) ? component : best,
  );
  const largestGridAreaSqm = componentAreaSqm(largestComponent, cellSize);
  const retainedRatio = setbackUsableAreaSqm > 0 ? largestGridAreaSqm / setbackUsableAreaSqm : 1;

  if (retainedRatio < layoutPolicy.narrowZoneMinRetainedAreaRatio) {
    return {
      layoutBoundary: ring,
      landUsableAreaSqm: round2(setbackUsableAreaSqm),
      narrowZone: {
        narrowZonePolicyApplied: false,
        unionComponentCount,
        usableComponentCount,
        selectedComponentAreaSqm: round2(setbackUsableAreaSqm),
        excludedComponentAreaSqm: 0,
        excludedNarrowAreaSqm,
        narrowZoneReason: "not_applied_retained_area_guard",
        estimatedMinWidthM,
        minLocalWidthM: estimatedMinWidthM,
        narrowWidthThresholdM: widthThresholdM,
        setbackUsableAreaSqm: round2(setbackUsableAreaSqm),
      },
    };
  }

  const localLayout = componentToLocalPolygon(largestComponent, grid);
  if (localLayout.length < 3) {
    return {
      layoutBoundary: ring,
      landUsableAreaSqm: round2(setbackUsableAreaSqm),
      narrowZone: {
        narrowZonePolicyApplied: false,
        unionComponentCount,
        usableComponentCount,
        selectedComponentAreaSqm: round2(setbackUsableAreaSqm),
        excludedComponentAreaSqm: 0,
        excludedNarrowAreaSqm,
        narrowZoneReason: "not_applied_insufficient_polygon",
        estimatedMinWidthM,
        minLocalWidthM: estimatedMinWidthM,
        narrowWidthThresholdM: widthThresholdM,
        setbackUsableAreaSqm: round2(setbackUsableAreaSqm),
      },
    };
  }

  const layoutBoundary = closeRing(localLayout.map((point) => toLatLng(point, origin)));
  const selectedComponentAreaSqm = round2(polygonAreaSqm(layoutBoundary));
  const excludedComponentAreaSqm = round2(
    Math.max(0, setbackUsableAreaSqm - selectedComponentAreaSqm),
  );

  return {
    layoutBoundary,
    landUsableAreaSqm: selectedComponentAreaSqm,
    narrowZone: {
      narrowZonePolicyApplied: true,
      unionComponentCount,
      usableComponentCount,
      selectedComponentAreaSqm,
      excludedComponentAreaSqm,
      excludedNarrowAreaSqm,
      narrowZoneReason: "main_component_selected",
      estimatedMinWidthM,
      minLocalWidthM: estimatedMinWidthM,
      narrowWidthThresholdM: widthThresholdM,
      setbackUsableAreaSqm: round2(setbackUsableAreaSqm),
    },
  };
}

/** land dual set 2-row 최소 깊이 참고값 (diagnostics) */
export function estimateLandDualMinWidthM(): number {
  const scale = moduleLayoutConfig.visualScale;
  const moduleLongM = moduleLayoutConfig.moduleLongM * scale;
  return round2(moduleLongM * 2 + layoutPolicy.innerTierGapM + layoutPolicy.dualArraySetAisleM);
}
