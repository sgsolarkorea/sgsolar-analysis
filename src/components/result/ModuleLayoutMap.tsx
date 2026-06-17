"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import MapPlaceholder from "@/components/result/MapPlaceholder";
import { moduleLayoutConfig } from "@/data/moduleLayoutConfig";
import {
  getKakaoMapErrorDetail,
  getKakaoMapErrorMessage,
  loadKakaoMapSdk,
  parseKakaoMapLoadError,
  type KakaoMapLoadError,
} from "@/lib/kakao/loadKakaoMapSdk";
import type { LatLngPoint, ModuleLayoutResult } from "@/types/moduleLayout";

interface ModuleLayoutMapProps {
  layout: ModuleLayoutResult;
  address: string;
  jibunAddress: string;
}

const JS_KEY = process.env.NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY?.trim() ?? "";
const { boundaryFill, boundary: boundaryStroke } = moduleLayoutConfig.colors;

function CompassRose() {
  return (
    <div
      className="pointer-events-none absolute right-3 top-3 z-20 flex h-11 w-11 flex-col items-center justify-center rounded-full border border-white/90 bg-white/95 shadow-md"
      aria-hidden
    >
      <span className="text-[10px] font-bold text-navy">N</span>
      <span className="mt-0.5 block h-3 w-0 border-x-[5px] border-b-[8px] border-x-transparent border-b-navy" />
    </div>
  );
}

/** 화면 좌표에서 모듈 Polygon을 중심 기준 축소 — 밀착 배치 시 Row가 하나의 띠로 합쳐 보이는 것 방지 */
function insetScreenCorners(
  corners: { x: number; y: number }[],
  ratio = 0.08,
): { x: number; y: number }[] {
  const cx = corners.reduce((sum, p) => sum + p.x, 0) / corners.length;
  const cy = corners.reduce((sum, p) => sum + p.y, 0) / corners.length;
  const scale = 1 - ratio;
  return corners.map((p) => ({
    x: cx + (p.x - cx) * scale,
    y: cy + (p.y - cy) * scale,
  }));
}

/** 640W 모듈 1장 — 회전된 4꼭짓점 Polygon */
function renderSolarModulePolygon(points: string): string {
  return `<polygon points="${points}" fill="url(#panelGrad)" stroke="rgba(148,163,184,0.85)" stroke-width="1" stroke-linejoin="miter" vector-effect="non-scaling-stroke" />`;
}

export default function ModuleLayoutMap({ layout, address, jibunAddress }: ModuleLayoutMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const mapInstanceRef = useRef<kakao.maps.Map | null>(null);
  const [loadError, setLoadError] = useState<KakaoMapLoadError | null>(
    JS_KEY ? null : "missing_key",
  );
  const [mapReady, setMapReady] = useState(false);

  const drawOverlay = useCallback(() => {
    const map = mapInstanceRef.current;
    const svg = svgRef.current;
    if (!map || !svg || !window.kakao?.maps) return;

    const projection = (
      map as kakao.maps.Map & {
        getProjection: () => {
          containerPointFromCoords: (latlng: kakao.maps.LatLng) => { x: number; y: number };
        };
      }
    ).getProjection();

    const toPoint = (point: LatLngPoint) => {
      const coords = new window.kakao.maps.LatLng(point.lat, point.lng);
      const pixel = projection.containerPointFromCoords(coords);
      return `${pixel.x},${pixel.y}`;
    };

    const toPoints = (ring: LatLngPoint[]) => ring.map(toPoint).join(" ");

    const compareMode = layout.overlayCompare === true;
    const rawRing =
      compareMode && layout.sourceBoundary && layout.sourceBoundary.length >= 3
        ? layout.sourceBoundary
        : layout.overlayRaw && layout.sourceBoundary && layout.sourceBoundary.length >= 3
          ? layout.sourceBoundary
          : null;

    const setbackRing =
      compareMode && layout.setbackBoundary && layout.setbackBoundary.length >= 3
        ? layout.setbackBoundary
        : null;

    const boundaryOverlays: string[] = [];

    if (compareMode && rawRing) {
      boundaryOverlays.push(
        `<polygon points="${toPoints(rawRing)}" fill="rgba(34, 197, 94, 0.22)" stroke="#16a34a" stroke-width="2.5" vector-effect="non-scaling-stroke" />`,
      );
    }

    if (compareMode && setbackRing) {
      boundaryOverlays.push(
        `<polygon points="${toPoints(setbackRing)}" fill="rgba(245, 158, 11, 0.35)" stroke="#f59e0b" stroke-width="2.5" vector-effect="non-scaling-stroke" />`,
      );
    }

    if (compareMode && layout.boundary.length >= 3) {
      boundaryOverlays.push(
        `<polygon points="${toPoints(layout.boundary)}" fill="none" stroke="#2563eb" stroke-width="2" stroke-dasharray="6 4" vector-effect="non-scaling-stroke" />`,
      );
    } else if (rawRing) {
      boundaryOverlays.push(
        `<polygon points="${toPoints(rawRing)}" fill="rgba(34, 197, 94, 0.25)" stroke="#16a34a" stroke-width="2.5" vector-effect="non-scaling-stroke" />`,
      );
    } else if (layout.boundary.length >= 3) {
      boundaryOverlays.push(
        `<polygon points="${toPoints(layout.boundary)}" fill="${boundaryFill}" stroke="${boundaryStroke}" stroke-width="2" vector-effect="non-scaling-stroke" />`,
      );
    }

    const boundaryOverlay = boundaryOverlays.join("");

    const modulePaths = layout.modules
      .map((mod) => {
        const pixels = mod.corners.map((pt) => {
          const coords = new window.kakao.maps.LatLng(pt.lat, pt.lng);
          return projection.containerPointFromCoords(coords);
        });
        const inset = insetScreenCorners(pixels);
        const points = inset.map((p) => `${p.x},${p.y}`).join(" ");
        return renderSolarModulePolygon(points);
      })
      .join("");

    svg.innerHTML = `
      <defs>
        <linearGradient id="panelGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#1e3a5f" />
          <stop offset="45%" stop-color="#172554" />
          <stop offset="100%" stop-color="#0f172a" />
        </linearGradient>
      </defs>
      ${boundaryOverlay}
      ${modulePaths}
    `;
  }, [layout]);

  useEffect(() => {
    if (!JS_KEY || loadError) return;

    let cancelled = false;

    loadKakaoMapSdk(JS_KEY)
      .then(() => {
        if (cancelled || !mapContainerRef.current || mapInstanceRef.current) return;

        window.kakao.maps.load(() => {
          if (cancelled || !mapContainerRef.current || mapInstanceRef.current) return;

          try {
            const center = new window.kakao.maps.LatLng(layout.center.lat, layout.center.lng);
            const map = new window.kakao.maps.Map(mapContainerRef.current, {
              center,
              level: 1,
              mapTypeId: window.kakao.maps.MapTypeId.HYBRID,
            });
            const zoomControl = new window.kakao.maps.ZoomControl();
            map.addControl(zoomControl, window.kakao.maps.ControlPosition.RIGHT);

            window.kakao.maps.event.addListener(map, "idle", drawOverlay);
            window.kakao.maps.event.addListener(map, "zoom_changed", drawOverlay);
            window.kakao.maps.event.addListener(map, "dragend", drawOverlay);

            mapInstanceRef.current = map;
            setMapReady(true);
            drawOverlay();
          } catch (error) {
            console.error("[ModuleLayoutMap] init failed:", error);
            setLoadError("init_error");
          }
        });
      })
      .catch((error) => {
        if (!cancelled) setLoadError(parseKakaoMapLoadError(error));
      });

    return () => {
      cancelled = true;
    };
  }, [loadError, drawOverlay, layout.center.lat, layout.center.lng]);

  useEffect(() => {
    if (!mapReady) return;
    drawOverlay();
  }, [mapReady, drawOverlay, layout]);

  useEffect(() => {
    const onResize = () => {
      mapInstanceRef.current?.relayout();
      drawOverlay();
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [drawOverlay]);

  if (loadError) {
    return (
      <MapPlaceholder
        address={address}
        jibunAddress={jibunAddress}
        lat={layout.center.lat}
        lng={layout.center.lng}
        notice={getKakaoMapErrorMessage(loadError)}
        detail={getKakaoMapErrorDetail(loadError)}
      />
    );
  }

  return (
    <div className="relative h-[320px] w-full overflow-hidden rounded-xl border border-slate-200 sm:h-[400px]">
      {!mapReady && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-100">
          <p className="text-sm font-medium text-slate-600">가배치도 지도를 불러오는 중...</p>
        </div>
      )}
      <CompassRose />
      <svg
        ref={svgRef}
        className="pointer-events-none absolute inset-0 z-[15] h-full w-full"
        aria-hidden
      />
      <div ref={mapContainerRef} className="h-full w-full" />
    </div>
  );
}
