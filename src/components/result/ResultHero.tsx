import Link from "next/link";
import { MARKETING_NAME, SITE_DISCLAIMER } from "@/data/sampleData";

interface ResultHeroProps {
  address: string;
  jibunAddress: string;
  buildingName?: string;
  analyzedAt: string;
}

export default function ResultHero({
  address,
  jibunAddress,
  buildingName,
  analyzedAt,
}: ResultHeroProps) {
  return (
    <div id="address-check" className="scroll-mt-24 bg-navy">
      <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-500 bg-slate-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-600"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            다시 검색
          </Link>
        </div>

        <h1 className="mt-3 text-xl font-bold text-white sm:text-2xl">
          {MARKETING_NAME} 태양광 입지검토 결과
        </h1>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-100">
          {MARKETING_NAME} 시공사례와 등록된 토지·건축물 정보를 바탕으로 분석한 결과입니다.
        </p>

        <dl className="mt-3 space-y-1.5 text-sm">
          <div>
            <dt className="text-slate-400">입력 주소</dt>
            <dd className="font-medium text-white">{address}</dd>
          </div>
          <div>
            <dt className="text-slate-400">지번 주소</dt>
            <dd className="font-medium text-white">{jibunAddress}</dd>
          </div>
          {buildingName && (
            <div>
              <dt className="text-slate-400">건물명</dt>
              <dd className="font-medium text-white">{buildingName}</dd>
            </div>
          )}
        </dl>

        <p className="mt-2 text-sm text-slate-200">분석 일시: {analyzedAt}</p>

        <p className="mt-3 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2.5 text-xs leading-relaxed text-slate-100 sm:text-sm">
          {SITE_DISCLAIMER}
        </p>
      </div>
    </div>
  );
}
