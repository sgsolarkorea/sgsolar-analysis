import KakaoMapView from "@/components/result/KakaoMapView";

interface MapAreaProps {
  address: string;
  jibunAddress: string;
  lat: number;
  lng: number;
}

export default function MapArea({ address, jibunAddress, lat, lng }: MapAreaProps) {
  return (
    <div className="card-premium overflow-hidden">
      <div className="relative h-[320px] w-full sm:h-[400px]">
        <KakaoMapView address={address} jibunAddress={jibunAddress} lat={lat} lng={lng} />
      </div>
      <div className="border-t border-slate-200 bg-slate-50 px-4 py-4 sm:px-6 sm:py-5">
        <p className="text-xs font-medium text-slate-500">도로명주소</p>
        <p className="mt-0.5 text-sm font-semibold text-slate-900 sm:text-base">{address}</p>
        <p className="mt-3 text-xs font-medium text-slate-500">지번주소</p>
        <p className="mt-0.5 text-sm text-slate-800">{jibunAddress}</p>
      </div>
    </div>
  );
}
