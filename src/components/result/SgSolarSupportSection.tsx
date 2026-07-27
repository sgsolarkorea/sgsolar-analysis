import Link from "next/link";
import { SG_SUPPORT_CATEGORIES } from "@/data/sgSupport";

/** FRAME 07 capability strip — deep navy horizontal band. */
export default function SgSolarSupportSection({ embedded = false }: { embedded?: boolean }) {
  const items = SG_SUPPORT_CATEGORIES.slice(0, 3);

  return (
    <div id="sg-support" className="overflow-hidden rounded-[22px] bg-[#07182f] text-white">
      <div className="grid gap-8 px-5 py-8 sm:px-8 sm:py-10 lg:grid-cols-[0.35fr_0.65fr] lg:items-center lg:gap-10">
        <div>
          {!embedded ? (
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-sky-300">Capability</p>
          ) : null}
          <h3 className={`font-extrabold text-white ${embedded ? "text-[20px]" : "mt-2 text-[24px] sm:text-[28px]"}`}>
            분석 이후 실제 사업까지 연결합니다
          </h3>
        </div>

        <ol className="grid gap-6 sm:grid-cols-3 sm:gap-8">
          {items.map((item) => (
            <li key={item.id}>
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/20 text-sky-300">
                <span className="text-sm font-bold">{item.title.slice(0, 1)}</span>
              </div>
              <p className="text-[16px] font-extrabold text-white">{item.title}</p>
              <p className="mt-2 text-[13px] leading-relaxed text-slate-300">{item.description}</p>
            </li>
          ))}
        </ol>
      </div>

      <div className="border-t border-white/10 px-5 py-4 sm:px-8">
        <Link
          href="#frame-conversion"
          className="inline-flex text-sm font-semibold text-sky-200 underline-offset-2 hover:underline"
        >
          무료 전문가 상담으로 이어가기
        </Link>
      </div>
    </div>
  );
}
