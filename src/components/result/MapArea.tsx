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

/** FRAME 01 — map hero; glass panel shows site facts only (no repeated address). */
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
    <div className="overflow-hidden rounded-[22px] bg-slate-900">
      <div className="relative h-[520px] w-full sm:h-[560px] lg:h-[620px]">
        <KakaoMapView
          address={address}
          jibunAddress={jibunAddress}
          lat={lat}
          lng={lng}
          showSetbackBuffers={false}
          showMapTypeToggle={false}
        />
        <div className="pointer-events-none absolute left-3 top-3 z-10 max-w-[min(100%,280px)] rounded-2xl border border-white/20 bg-white/12 px-4 py-4 shadow-sm backdrop-blur-md sm:left-5 sm:top-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-sky-100">분석 부지</p>
          <dl className="mt-3 space-y-2.5 text-white">
            {areaLabel ? (
              <div>
                <dt className="text-[12px] text-sky-100/80">분석면적</dt>
                <dd className="mt-0.5 text-[18px] font-extrabold">{areaLabel}</dd>
              </div>
            ) : null}
            {landCategory ? (
              <div className="flex items-baseline justify-between gap-3 border-t border-white/15 pt-2.5">
                <dt className="text-[13px] text-sky-100/80">지목</dt>
                <dd className="text-[14px] font-semibold">{landCategory}</dd>
              </div>
            ) : null}
            {zoning ? (
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-[13px] text-sky-100/80">용도지역</dt>
                <dd className="text-right text-[14px] font-semibold">{zoning}</dd>
              </div>
            ) : null}
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-[13px] text-sky-100/80">건축물</dt>
              <dd className="text-[14px] font-semibold">{buildingPresent ? "확인됨" : "확인 필요"}</dd>
            </div>
            {installType ? (
              <div className="flex items-baseline justify-between gap-3 border-t border-white/15 pt-2.5">
                <dt className="text-[13px] text-sky-100/80">설치유형</dt>
                <dd className="text-[14px] font-bold text-sky-200">{installType}</dd>
              </div>
            ) : null}
          </dl>
        </div>
      </div>
      {jibunAddress !== address ? (
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
