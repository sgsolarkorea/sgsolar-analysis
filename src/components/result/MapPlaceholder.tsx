interface MapPlaceholderProps {
  address: string;
  jibunAddress: string;
  lat: number;
  lng: number;
  notice?: string;
  detail?: string;
}

export default function MapPlaceholder({
  address,
  jibunAddress,
  lat,
  lng,
  notice = "카카오 지도를 불러올 수 없습니다.",
  detail,
}: MapPlaceholderProps) {
  return (
    <>
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "linear-gradient(#cbd5e1 1px, transparent 1px), linear-gradient(90deg, #cbd5e1 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-navy shadow-lg ring-4 ring-white">
          <svg className="h-7 w-7 text-white" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
          </svg>
        </div>
        <p className="rounded-lg bg-white/95 px-4 py-2 text-center text-sm font-medium text-slate-700 shadow">
          {notice}
        </p>
        {detail && (
          <p className="max-w-sm rounded-lg bg-amber-50 px-4 py-2 text-center text-xs leading-relaxed text-amber-900">
            {detail}
          </p>
        )}
      </div>
      <div className="absolute right-3 top-3 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-navy-muted shadow">
        좌표 연동 · 지도 placeholder
      </div>
      <div className="absolute bottom-0 left-0 right-0 bg-navy/90 px-4 py-4 sm:px-6 sm:py-5">
        <p className="text-xs text-slate-300">도로명주소</p>
        <p className="text-sm font-semibold text-white sm:text-base">{address}</p>
        <p className="mt-2 text-xs text-slate-300">지번주소</p>
        <p className="text-sm text-slate-100">{jibunAddress}</p>
        <p className="mt-2 text-xs text-slate-300">
          위도 {lat.toFixed(6)}° · 경도 {lng.toFixed(6)}°
        </p>
      </div>
    </>
  );
}
