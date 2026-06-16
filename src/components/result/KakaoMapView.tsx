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
}

type MapViewType = "roadmap" | "hybrid";

const JS_KEY = process.env.NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY?.trim() ?? "";

function resolveMapTypeId(type: MapViewType): kakao.maps.MapTypeId {
  return type === "hybrid"
    ? window.kakao.maps.MapTypeId.HYBRID
    : window.kakao.maps.MapTypeId.ROADMAP;
}

function initMap(container: HTMLDivElement, lat: number, lng: number, mapType: MapViewType) {
  const center = new window.kakao.maps.LatLng(lat, lng);
  const map = new window.kakao.maps.Map(container, {
    center,
    level: 3,
    mapTypeId: resolveMapTypeId(mapType),
  });
  const zoomControl = new window.kakao.maps.ZoomControl();
  map.addControl(zoomControl, window.kakao.maps.ControlPosition.RIGHT);
  const marker = new window.kakao.maps.Marker({ position: center, map });
  return { map, marker };
}

export default function KakaoMapView({ address, jibunAddress, lat, lng }: KakaoMapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<kakao.maps.Map | null>(null);
  const markerRef = useRef<kakao.maps.Marker | null>(null);
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
            const { map, marker } = initMap(mapContainerRef.current, lat, lng, mapType);
            mapInstanceRef.current = map;
            markerRef.current = marker;
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
  }, [loadError]);

  useEffect(() => {
    if (!mapInstanceRef.current || !markerRef.current) return;

    const center = new window.kakao.maps.LatLng(lat, lng);
    mapInstanceRef.current.setCenter(center);
    mapInstanceRef.current.setLevel(3);
    markerRef.current.setPosition(center);
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

      <div ref={mapContainerRef} className="h-full w-full" />
    </div>
  );
}
