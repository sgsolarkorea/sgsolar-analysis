import KakaoMapView from "@/components/result/KakaoMapView";

interface MapAreaProps {
  address: string;
  jibunAddress: string;
  lat: number;
  lng: number;
  installType?: string;
  areaLabel?: string;
}

export default function MapArea({
  address,
  jibunAddress,
  lat,
  lng,
  installType,
  areaLabel,
}: MapAreaProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="relative h-[480px] w-full sm:h-[540px] lg:h-[580px]">
        <KakaoMapView address={address} jibunAddress={jibunAddress} lat={lat} lng={lng} />
        <div className="pointer-events-none absolute left-3 top-3 z-10 max-w-[min(100%,280px)] rounded-xl border border-white/70 bg-white/95 px-3 py-2.5 shadow-md backdrop-blur-sm">
          <p className="truncate text-xs font-semibold text-slate-900">{address}</p>
          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-600">
            {areaLabel ? <span>면적 {areaLabel}</span> : null}
            {installType ? <span>형태 {installType}</span> : null}
          </div>
          <p className="mt-1.5 text-[10px] font-medium text-slate-500">지도 · 부지 위치 확인</p>
        </div>
      </div>
      <div className="border-t border-slate-200 bg-slate-50 px-4 py-4 sm:px-6 sm:py-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium text-slate-500">도로명주소</p>
            <p className="mt-0.5 text-sm font-semibold text-slate-900 sm:text-base">{address}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">지번주소</p>
            <p className="mt-0.5 text-sm text-slate-800">{jibunAddress}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
