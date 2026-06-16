"use client";

import { useEffect, useRef, useState } from "react";
import MapPlaceholder from "@/components/result/MapPlaceholder";
import {
  getKakaoMapErrorDetail,
  getKakaoMapErrorMessage,
  loadKakaoMapSdk,
  parseKakaoMapLoadError,
  type KakaoMapLoadError,
} from "@/lib/kakao/loadKakaoMapSdk";

interface KakaoMapViewProps {
  address: string;
  jibunAddress: string;
  lat: number;
  lng: number;
  showSetbackBuffers?: boolean;
}

type MapViewType = "roadmap" | "hybrid";

const JS_KEY = process.env.NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY?.trim() ?? "";

const SETBACK_BUFFERS = [
  { radius: 300, color: "#9333EA", label: "보라 300m" },
  { radius: 200, color: "#84CC16", label: "연두 200m" },
  { radius: 100, color: "#F97316", label: "주황 100m" },
] as const;

function resolveMapTypeId(type: MapViewType): kakao.maps.MapTypeId {
  return type === "hybrid"
    ? window.kakao.maps.MapTypeId.HYBRID
    : window.kakao.maps.MapTypeId.ROADMAP;
}

function createSetbackCircles(
  map: kakao.maps.Map,
  center: kakao.maps.LatLng,
): kakao.maps.Circle[] {
  return SETBACK_BUFFERS.map(
    ({ radius, color }) =>
      new window.kakao.maps.Circle({
        center,
        radius,
        strokeWeight: 1.5,
        strokeColor: color,
        strokeOpacity: 0.55,
        strokeStyle: "solid",
        fillColor: color,
        fillOpacity: 0.14,
        map,
      }),
  );
}

function initMap(
  container: HTMLDivElement,
  lat: number,
  lng: number,
  mapType: MapViewType,
  showSetbackBuffers: boolean,
) {
  const center = new window.kakao.maps.LatLng(lat, lng);
  const map = new window.kakao.maps.Map(container, {
    center,
    level: 3,
    mapTypeId: resolveMapTypeId(mapType),
  });
  const zoomControl = new window.kakao.maps.ZoomControl();
  map.addControl(zoomControl, window.kakao.maps.ControlPosition.RIGHT);
  const marker = new window.kakao.maps.Marker({ position: center, map });
  const circles = showSetbackBuffers ? createSetbackCircles(map, center) : [];
  return { map, marker, circles };
}

export default function KakaoMapView({
  address,
  jibunAddress,
  lat,
  lng,
  showSetbackBuffers = true,
}: KakaoMapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<kakao.maps.Map | null>(null);
  const markerRef = useRef<kakao.maps.Marker | null>(null);
  const circlesRef = useRef<kakao.maps.Circle[]>([]);
  const [loadError, setLoadError] = useState<KakaoMapLoadError | null>(
    JS_KEY ? null : "missing_key",
  );
  const [mapReady, setMapReady] = useState(false);
  const [mapType, setMapType] = useState<MapViewType>("hybrid");

  useEffect(() => {
    if (!JS_KEY || loadError) return;

    let cancelled = false;

    loadKakaoMapSdk(JS_KEY)
      .then(() => {
        if (cancelled || !mapContainerRef.current) return;

        window.kakao.maps.load(() => {
          if (cancelled || !mapContainerRef.current || mapInstanceRef.current) return;

          try {
            const { map, marker, circles } = initMap(
              mapContainerRef.current,
              lat,
              lng,
              mapType,
              showSetbackBuffers,
            );
            mapInstanceRef.current = map;
            markerRef.current = marker;
            circlesRef.current = circles;
            setMapReady(true);
          } catch (error) {
            console.error("[KakaoMap] init failed:", error);
            setLoadError("init_error");
          }
        });
      })
      .catch((error) => {
        console.error("[KakaoMap] SDK load failed:", error);
        if (!cancelled) setLoadError(parseKakaoMapLoadError(error));
      });

    return () => {
      cancelled = true;
    };
  }, [loadError, showSetbackBuffers]);

  useEffect(() => {
    if (!mapInstanceRef.current || !markerRef.current) return;

    const center = new window.kakao.maps.LatLng(lat, lng);
    mapInstanceRef.current.setCenter(center);
    mapInstanceRef.current.setLevel(3);
    markerRef.current.setPosition(center);
    circlesRef.current.forEach((circle) => circle.setOptions({ center }));
    mapInstanceRef.current.relayout();
  }, [lat, lng, mapReady]);

  useEffect(() => {
    if (!mapInstanceRef.current || !mapReady) return;
    mapInstanceRef.current.setMapTypeId(resolveMapTypeId(mapType));
  }, [mapType, mapReady]);

  if (loadError) {
    return (
      <MapPlaceholder
        address={address}
        jibunAddress={jibunAddress}
        lat={lat}
        lng={lng}
        notice={getKakaoMapErrorMessage(loadError)}
        detail={getKakaoMapErrorDetail(loadError)}
      />
    );
  }

  return (
    <div className="relative h-full w-full">
      {!mapReady && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-100">
          <p className="text-sm font-medium text-slate-600">위치 지도를 불러오는 중...</p>
        </div>
      )}

      <div className="absolute right-3 top-3 z-20 flex overflow-hidden rounded-lg border border-white/90 bg-white/95 shadow-md">
        <button
          type="button"
          onClick={() => setMapType("roadmap")}
          aria-pressed={mapType === "roadmap"}
          className={`px-2.5 py-1.5 text-xs font-semibold transition-colors sm:px-3 sm:text-sm ${
            mapType === "roadmap"
              ? "bg-navy text-white"
              : "text-slate-700 hover:bg-slate-50"
          }`}
        >
          일반지도
        </button>
        <button
          type="button"
          onClick={() => setMapType("hybrid")}
          aria-pressed={mapType === "hybrid"}
          className={`border-l border-slate-200 px-2.5 py-1.5 text-xs font-semibold transition-colors sm:px-3 sm:text-sm ${
            mapType === "hybrid"
              ? "bg-navy text-white"
              : "text-slate-700 hover:bg-slate-50"
          }`}
        >
          위성지도
        </button>
      </div>

      {showSetbackBuffers && mapReady && (
        <div className="absolute bottom-3 left-3 z-20 max-w-[220px] rounded-lg border border-white/90 bg-white/95 px-3 py-2.5 shadow-md">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            이격거리 참고
          </p>
          <ul className="mt-1.5 space-y-1">
            {SETBACK_BUFFERS.map(({ radius, color, label }) => (
              <li key={radius} className="flex items-center gap-2 text-xs text-slate-700">
                <span
                  className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: color, opacity: 0.75 }}
                />
                {label}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[10px] leading-relaxed text-slate-500">
            부지 경계 기준 참고용 거리이며 실제 허가 검토 시 오차가 있을 수 있습니다.
          </p>
        </div>
      )}

      <div ref={mapContainerRef} className="h-full w-full" />
    </div>
  );
}
