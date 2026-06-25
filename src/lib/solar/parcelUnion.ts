import {
  centroid,
  closeRing,
  normalizeRing,
  polygonAreaSqm,
  toLatLng,
  toLocal,
  type LocalPoint,
} from "@/lib/solar/polygonGeometry";
import type { LatLngPoint } from "@/types/moduleLayout";

export interface ParcelUnionResult {
  /** layout·setback에 사용할 merged outer ring */
  ring: LatLngPoint[];
  /** union 결과 outer ring 목록 (disjoint 시 다수) */
  componentRings: LatLngPoint[][];
  unionComponentCount: number;
  mergedParcelRingCount: number;
}

const EDGE_KEY_PRECISION = 4;

function roundCoord(value: number): number {
  const factor = 10 ** EDGE_KEY_PRECISION;
  return Math.round(value * factor) / factor;
}

function pointKey(x: number, y: number): string {
  return `${roundCoord(x)},${roundCoord(y)}`;
}

function undirectedEdgeKey(x1: number, y1: number, x2: number, y2: number): string {
  const a = pointKey(x1, y1);
  const b = pointKey(x2, y2);
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

function ringsToLocal(rings: LatLngPoint[][], origin: LatLngPoint): LocalPoint[][] {
  return rings
    .filter((ring) => ring.length >= 3)
    .map((ring) => toLocal(normalizeRing(ring), origin));
}

/** 공유 edge 제거 후 outer boundary loop 추출 */
function unionLocalRings(localRings: LocalPoint[][]): LocalPoint[][] {
  const edgeUseCount = new Map<string, number>();
  const directedEdges: Array<{ from: string; to: string; fromPoint: LocalPoint; toPoint: LocalPoint }> = [];

  for (const ring of localRings) {
    for (let i = 0; i < ring.length; i++) {
      const from = ring[i];
      const to = ring[(i + 1) % ring.length];
      const key = undirectedEdgeKey(from.x, from.y, to.x, to.y);
      edgeUseCount.set(key, (edgeUseCount.get(key) ?? 0) + 1);
      directedEdges.push({
        from: pointKey(from.x, from.y),
        to: pointKey(to.x, to.y),
        fromPoint: from,
        toPoint: to,
      });
    }
  }

  const adjacency = new Map<string, Array<{ to: string; toPoint: LocalPoint }>>();
  for (const edge of directedEdges) {
    const key = undirectedEdgeKey(edge.fromPoint.x, edge.fromPoint.y, edge.toPoint.x, edge.toPoint.y);
    if ((edgeUseCount.get(key) ?? 0) !== 1) continue;
    const next = adjacency.get(edge.from) ?? [];
    next.push({ to: edge.to, toPoint: edge.toPoint });
    adjacency.set(edge.from, next);
  }

  const visited = new Set<string>();
  const loops: LocalPoint[][] = [];

  for (const [startKey] of adjacency) {
    if (visited.has(startKey)) continue;

    const loop: LocalPoint[] = [];
    let currentKey = startKey;
    let guard = 0;

    while (guard++ < 10_000) {
      const options = adjacency.get(currentKey);
      if (!options?.length) break;

      const next = options.find((item) => !visited.has(`${currentKey}->${item.to}`)) ?? options[0];
      const edgeId = `${currentKey}->${next.to}`;
      if (visited.has(edgeId)) break;
      visited.add(edgeId);

      const [x, y] = currentKey.split(",").map(Number);
      loop.push({ x, y });

      currentKey = next.to;
      if (currentKey === startKey) break;
    }

    if (loop.length >= 3) loops.push(loop);
  }

  return loops;
}

function localRingToLatLng(ring: LocalPoint[], origin: LatLngPoint): LatLngPoint[] {
  return closeRing(ring.map((point) => toLatLng(point, origin)));
}

function pickLargestRing(rings: LatLngPoint[][]): LatLngPoint[] {
  if (rings.length === 0) return [];
  return rings.reduce((best, ring) =>
    polygonAreaSqm(ring) > polygonAreaSqm(best) ? ring : best,
  );
}

/** 선택 필지 cadastral ring들을 하나의 사업부지 polygon으로 union */
export function unionCadastralRings(rings: LatLngPoint[][]): ParcelUnionResult | null {
  const valid = rings.filter((ring) => ring.length >= 3);
  if (valid.length === 0) return null;

  if (valid.length === 1) {
    const ring = closeRing(normalizeRing(valid[0]));
    return {
      ring,
      componentRings: [ring],
      unionComponentCount: 1,
      mergedParcelRingCount: 1,
    };
  }

  const origin = centroid(valid.flat());
  const localRings = ringsToLocal(valid, origin);
  const localLoops = unionLocalRings(localRings);

  if (localLoops.length === 0) {
    const fallbackRings = valid.map((ring) => closeRing(normalizeRing(ring)));
    return {
      ring: pickLargestRing(fallbackRings),
      componentRings: fallbackRings,
      unionComponentCount: fallbackRings.length,
      mergedParcelRingCount: valid.length,
    };
  }

  const componentRings = localLoops.map((loop) => localRingToLatLng(loop, origin));
  const ring = pickLargestRing(componentRings);

  return {
    ring,
    componentRings,
    unionComponentCount: componentRings.length,
    mergedParcelRingCount: valid.length,
  };
}
