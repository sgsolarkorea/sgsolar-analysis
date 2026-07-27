import Link from "next/link";
import { SG_SUPPORT_CATEGORIES, SG_TRUST_FACTS } from "@/data/sgSupport";

export default function SgSolarSupportSection() {
  return (
    <section id="sg-support" className="scroll-mt-28" aria-labelledby="sg-support-heading">
      <div className="grid gap-10 lg:grid-cols-[0.95fr_1.35fr] lg:items-start">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-sky-700">After Analysis</p>
          <h2 id="sg-support-heading" className="mt-2 text-[28px] font-extrabold text-navy sm:text-[32px]">
            분석 이후 실제 사업까지 연결합니다
          </h2>
          <p className="mt-3 max-w-md text-[15px] leading-relaxed text-slate-600">
            1차 입지검토 이후 설계·인허가·계통·시공·운영까지, 회사소개서에 명시된 사업 영역 안에서
            지원합니다.
          </p>
          <Link href="#consultation" className="btn-primary mt-6 inline-flex h-12 items-center px-6 text-sm font-bold">
            무료 전문가 상담 신청
          </Link>
        </div>

        <ol className="space-y-0 border-t border-slate-200">
          {SG_SUPPORT_CATEGORIES.map((item, index) => (
            <li key={item.id} className="grid gap-2 border-b border-slate-200 py-5 sm:grid-cols-[72px_1fr] sm:gap-4">
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

      <ul className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {SG_TRUST_FACTS.map((fact) => (
          <li key={fact.label} className="bg-navy px-4 py-4 text-white">
            <p className="text-sm font-extrabold">{fact.label}</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-300">{fact.detail}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
