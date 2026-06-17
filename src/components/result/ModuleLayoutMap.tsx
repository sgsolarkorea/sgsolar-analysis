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
const { boundaryFill, moduleFrame, moduleCell, moduleHighlight } = moduleLayoutConfig.colors;

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

function renderSolarModuleSvg(minX: number, minY: number, maxX: number, maxY: number): string {
  const w = maxX - minX;
  const h = maxY - minY;
  const frame = Math.max(0.6, Math.min(w, h) * 0.04);
  const ix = minX + frame;
  const iy = minY + frame;
  const iw = w - frame * 2;
  const ih = h - frame * 2;

  const cellLines: string[] = [];
  const cols = 6;
  const rows = 10;
  for (let c = 1; c < cols; c++) {
    const x = ix + (iw * c) / cols;
    cellLines.push(
      `<line x1="${x}" y1="${iy}" x2="${x}" y2="${iy + ih}" stroke="${moduleCell}" stroke-width="0.25" opacity="0.55" />`,
    );
  }
  for (let r = 1; r < rows; r++) {
    const y = iy + (ih * r) / rows;
    cellLines.push(
      `<line x1="${ix}" y1="${y}" x2="${ix + iw}" y2="${y}" stroke="${moduleCell}" stroke-width="0.2" opacity="0.45" />`,
    );
  }

  const highlightW = iw * 0.35;
  return `<g>
    <rect x="${minX}" y="${minY}" width="${w}" height="${h}" rx="0.4" fill="url(#panelGrad)" stroke="${moduleFrame}" stroke-width="0.65" />
    <rect x="${ix}" y="${iy}" width="${iw}" height="${ih}" fill="url(#panelFace)" stroke="none" />
    ${cellLines.join("")}
    <rect x="${ix + iw * 0.08}" y="${iy + ih * 0.06}" width="${highlightW}" height="${ih * 0.12}" rx="0.3" fill="${moduleHighlight}" opacity="0.7" />
  </g>`;
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

    const boundaryOverlay =
      layout.boundary.length >= 3
        ? `<polygon points="${layout.boundary.map(toPoint).join(" ")}" fill="${boundaryFill}" stroke="none" />`
        : "";

    const modulePaths = layout.modules
      .map((mod) => {
        const xs = mod.corners.map((pt) => {
          const coords = new window.kakao.maps.LatLng(pt.lat, pt.lng);
          return projection.containerPointFromCoords(coords).x;
        });
        const ys = mod.corners.map((pt) => {
          const coords = new window.kakao.maps.LatLng(pt.lat, pt.lng);
          return projection.containerPointFromCoords(coords).y;
        });
        return renderSolarModuleSvg(
          Math.min(...xs),
          Math.min(...ys),
          Math.max(...xs),
          Math.max(...ys),
        );
      })
      .join("");

    svg.innerHTML = `
      <defs>
        <linearGradient id="panelGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#1e3a5f" />
          <stop offset="45%" stop-color="#172554" />
          <stop offset="100%" stop-color="#0f172a" />
        </linearGradient>
        <linearGradient id="panelFace" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#1e40af" stop-opacity="0.35" />
          <stop offset="35%" stop-color="#1e293b" stop-opacity="0.95" />
          <stop offset="100%" stop-color="#020617" stop-opacity="1" />
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
