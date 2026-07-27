import KakaoMapView from "@/components/result/KakaoMapView";

interface MapAreaProps {
  address: string;
  jibunAddress: string;
  lat: number;
  lng: number;
  installType?: string;
  areaLabel?: string;
  landCategory?: string;
  zoning?: string;
}

export default function MapArea({
  address,
  jibunAddress,
  lat,
  lng,
  installType,
  areaLabel,
  landCategory,
  zoning,
}: MapAreaProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="relative h-[480px] w-full sm:h-[520px] lg:h-[560px]">
        <KakaoMapView address={address} jibunAddress={jibunAddress} lat={lat} lng={lng} />
        <div className="pointer-events-none absolute left-3 top-3 z-10 max-w-[min(100%,300px)] rounded-xl border border-white/70 bg-white/95 px-3.5 py-3 shadow-md backdrop-blur-sm">
          <p className="truncate text-sm font-semibold text-slate-900">{address}</p>
          <dl className="mt-2 grid gap-1.5 text-[12px] text-slate-600">
            {areaLabel ? (
              <div className="flex justify-between gap-4">
                <dt>분석 면적</dt>
                <dd className="font-semibold text-slate-900">{areaLabel}</dd>
              </div>
            ) : null}
            {landCategory ? (
              <div className="flex justify-between gap-4">
                <dt>지목</dt>
                <dd className="font-semibold text-slate-900">{landCategory}</dd>
              </div>
            ) : null}
            {zoning ? (
              <div className="flex justify-between gap-4">
                <dt>용도</dt>
                <dd className="font-semibold text-slate-900">{zoning}</dd>
              </div>
            ) : null}
            {installType ? (
              <div className="flex justify-between gap-4">
                <dt>설치 형태</dt>
                <dd className="font-semibold text-slate-900">{installType}</dd>
              </div>
            ) : null}
          </dl>
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
