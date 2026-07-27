import Link from "next/link";
import { SG_SUPPORT_SERVICES, SG_TRUST_FACTS } from "@/data/sgSupport";

export default function SgSolarSupportSection() {
  return (
    <section id="sg-support" className="scroll-mt-28" aria-labelledby="sg-support-heading">
      <div className="grid gap-8 lg:grid-cols-[1.1fr_1.4fr] lg:items-center">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-sky-700">After Analysis</p>
          <h2 id="sg-support-heading" className="mt-2 text-[26px] font-extrabold text-navy sm:text-[28px]">
            SG SOLAR가 함께합니다
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-slate-600">
            1차 입지검토 이후에도 설계·인허가·계통·시공·SMP·REC 운영까지 회사소개서에 명시된 사업
            영역 안에서 지원합니다.
          </p>
          <Link href="#consultation" className="btn-primary mt-6 inline-flex h-12 items-center px-6 text-sm font-bold">
            무료 전문가 상담 신청
          </Link>
        </div>

        <ul className="grid gap-3 sm:grid-cols-2">
          {SG_SUPPORT_SERVICES.map((item) => (
            <li key={item.id} className="rounded-2xl border border-slate-200/80 bg-slate-50/80 px-4 py-4">
              <p className="text-[15px] font-bold text-navy">{item.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">{item.description}</p>
            </li>
          ))}
        </ul>
      </div>

      <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {SG_TRUST_FACTS.map((fact) => (
          <li key={fact.label} className="rounded-xl border border-navy/10 bg-navy px-4 py-4 text-white">
            <p className="text-sm font-extrabold">{fact.label}</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-300">{fact.detail}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
