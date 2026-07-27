import Link from "next/link";
import { SG_SUPPORT_CATEGORIES } from "@/data/sgSupport";

/** Capability strip — secondary to photography in PROOF frame. */
export default function SgSolarSupportSection({ embedded = false }: { embedded?: boolean }) {
  const items = SG_SUPPORT_CATEGORIES.slice(0, 3);

  return (
    <div id="sg-support">
      {!embedded ? (
        <>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-sky-700">Capability</p>
          <h2 className="mt-2 text-[28px] font-extrabold text-navy sm:text-[32px]">
            분석 이후 실제 사업까지 연결합니다
          </h2>
        </>
      ) : (
        <h3 className="text-[18px] font-extrabold text-navy">SG SOLAR 역량</h3>
      )}
      <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-slate-600">
        설계·인허가부터 계통·시공, 운영·관리까지 회사소개서에 명시된 사업 영역 안에서 지원합니다.
      </p>

      <ol className="mt-6 grid gap-6 border-t border-slate-200 pt-6 sm:grid-cols-3">
        {items.map((item, index) => (
          <li key={item.id}>
            <p className="text-[12px] font-bold text-slate-400">{String(index + 1).padStart(2, "0")}</p>
            <p className="mt-1 text-[16px] font-extrabold text-navy">{item.title}</p>
            <p className="mt-2 text-[13px] leading-relaxed text-slate-600">{item.description}</p>
          </li>
        ))}
      </ol>

      <Link
        href="#frame-conversion"
        className="mt-6 inline-flex text-sm font-semibold text-navy underline-offset-2 hover:underline"
      >
        무료 전문가 상담으로 이어가기
      </Link>
    </div>
  );
}
