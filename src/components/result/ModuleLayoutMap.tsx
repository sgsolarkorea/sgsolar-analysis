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

    const boundaryPath = layout.boundary.map(toPoint).join(" ");
    const modulePaths = layout.modules
      .map((mod) => {
        const points = mod.corners.map(toPoint).join(" ");
        const xs = mod.corners.map((_, i) => {
          const pt = mod.corners[i];
          const coords = new window.kakao.maps.LatLng(pt.lat, pt.lng);
          return projection.containerPointFromCoords(coords).x;
        });
        const ys = mod.corners.map((pt) => {
          const coords = new window.kakao.maps.LatLng(pt.lat, pt.lng);
          return projection.containerPointFromCoords(coords).y;
        });
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);
        const cellLines: string[] = [];
        const rowCount = 4;
        for (let r = 1; r < rowCount; r++) {
          const y = minY + ((maxY - minY) * r) / rowCount;
          cellLines.push(
            `<line x1="${minX}" y1="${y}" x2="${maxX}" y2="${y}" stroke="#94a3b8" stroke-width="0.4" opacity="0.55" />`,
          );
        }
        const colCount = 3;
        for (let c = 1; c < colCount; c++) {
          const x = minX + ((maxX - minX) * c) / colCount;
          cellLines.push(
            `<line x1="${x}" y1="${minY}" x2="${x}" y2="${maxY}" stroke="#64748b" stroke-width="0.35" opacity="0.45" />`,
          );
        }
        return `<g>
          <polygon points="${points}" fill="url(#panelGrad)" fill-opacity="0.94" stroke="#0f172a" stroke-width="0.6" />
          ${cellLines.join("")}
        </g>`;
      })
      .join("");

    svg.innerHTML = `
      <defs>
        <linearGradient id="panelGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#475569" />
          <stop offset="45%" stop-color="#1e293b" />
          <stop offset="100%" stop-color="#0f172a" />
        </linearGradient>
      </defs>
      <polygon points="${boundaryPath}" fill="${moduleLayoutConfig.colors.boundaryFill}" stroke="${moduleLayoutConfig.colors.boundary}" stroke-width="2.5" stroke-dasharray="6 4" />
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
              level: 2,
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
