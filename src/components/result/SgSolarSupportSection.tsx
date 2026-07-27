import Link from "next/link";
import { SG_SUPPORT_CATEGORIES } from "@/data/sgSupport";

export default function SgSolarSupportSection({ embedded = false }: { embedded?: boolean }) {
  return (
    <div id="sg-support">
      <div className="grid gap-10 lg:grid-cols-[0.95fr_1.35fr] lg:items-start">
        <div>
          {!embedded ? (
            <>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-sky-700">After Analysis</p>
              <h2 className="mt-2 text-[28px] font-extrabold text-navy sm:text-[32px]">
                분석 이후 실제 사업까지 연결합니다
              </h2>
            </>
          ) : null}
          <p className={`${embedded ? "" : "mt-3 "}max-w-md text-[15px] leading-relaxed text-slate-600`}>
            1차 입지검토 이후 설계·인허가·계통·시공·운영까지, 회사소개서에 명시된 사업 영역 안에서
            지원합니다.
          </p>
          <Link
            href="#frame-conversion"
            className="btn-primary mt-6 inline-flex h-12 items-center px-6 text-sm font-bold"
          >
            무료 전문가 상담 신청
          </Link>
        </div>

        <ol className="space-y-0 border-t border-slate-200">
          {SG_SUPPORT_CATEGORIES.map((item, index) => (
            <li
              key={item.id}
              className="grid gap-2 border-b border-slate-200 py-5 sm:grid-cols-[56px_1fr] sm:gap-4"
            >
              <p className="text-sm font-bold text-sky-700">{String(index + 1).padStart(2, "0")}</p>
              <div>
                <p className="text-[18px] font-extrabold text-navy">{item.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">{item.description}</p>
                <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
                  {item.scopes.map((scope) => (
                    <li key={scope}>· {scope}</li>
                  ))}
                </ul>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
