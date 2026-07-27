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
  buildingPresent?: boolean;
}

/** FRAME 01 hero — map canvas, not nested report card. */
export default function MapArea({
  address,
  jibunAddress,
  lat,
  lng,
  installType,
  areaLabel,
  landCategory,
  zoning,
  buildingPresent,
}: MapAreaProps) {
  return (
    <div className="overflow-hidden bg-slate-900">
      <div className="relative h-[520px] w-full sm:h-[560px] lg:h-[620px]">
        <KakaoMapView address={address} jibunAddress={jibunAddress} lat={lat} lng={lng} />
        <div className="pointer-events-none absolute left-3 top-3 z-10 max-w-[min(100%,300px)] bg-white/92 px-4 py-4 shadow-lg backdrop-blur-md sm:left-4 sm:top-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-sky-700">분석 부지</p>
          <p className="mt-1.5 text-[15px] font-bold leading-snug text-navy">{address}</p>
          <dl className="mt-4 space-y-2.5">
            {areaLabel ? (
              <div>
                <dt className="text-[12px] text-slate-500">면적</dt>
                <dd className="mt-0.5 text-[17px] font-extrabold text-navy">{areaLabel}</dd>
              </div>
            ) : null}
            {landCategory ? (
              <div className="flex items-baseline justify-between gap-3 border-t border-slate-100 pt-2.5">
                <dt className="text-[13px] text-slate-500">지목</dt>
                <dd className="text-[14px] font-semibold text-slate-900">{landCategory}</dd>
              </div>
            ) : null}
            {zoning ? (
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-[13px] text-slate-500">용도지역</dt>
                <dd className="text-right text-[14px] font-semibold text-slate-900">{zoning}</dd>
              </div>
            ) : null}
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-[13px] text-slate-500">건축물</dt>
              <dd className="text-[14px] font-semibold text-slate-900">
                {buildingPresent ? "확인됨" : "확인 필요"}
              </dd>
            </div>
            {installType ? (
              <div className="flex items-baseline justify-between gap-3 border-t border-slate-100 pt-2.5">
                <dt className="text-[13px] text-slate-500">설치형태</dt>
                <dd className="text-[14px] font-bold text-sky-800">{installType}</dd>
              </div>
            ) : null}
          </dl>
        </div>
      </div>
      {(jibunAddress !== address) ? (
        <div className="flex flex-wrap gap-x-8 gap-y-1 bg-navy/95 px-4 py-3 text-[13px] text-slate-300 sm:px-5">
          <p>
            <span className="text-slate-500">도로명 </span>
            {address}
          </p>
          <p>
            <span className="text-slate-500">지번 </span>
            {jibunAddress}
          </p>
        </div>
      ) : null}
    </div>
  );
}
