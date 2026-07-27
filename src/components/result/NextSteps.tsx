import Link from "next/link";

const STEPS = [
  {
    num: "01",
    title: "현장 확인",
    description: "음영·구조·진입 여건을 확인하고 설치 가능 범위를 확정합니다.",
  },
  {
    num: "02",
    title: "계통 확인",
    description: "한전 접속 가능 여부와 관할 사업소 검토를 진행합니다.",
  },
  {
    num: "03",
    title: "실시설계",
    description: "최종 모듈 배치와 설치용량을 확정하고 시공 준비를 합니다.",
  },
] as const;

export default function NextSteps() {
  return (
    <section id="next-steps" className="scroll-mt-24" aria-labelledby="next-steps-heading">
      <h2 id="next-steps-heading" className="text-2xl font-extrabold tracking-tight text-navy sm:text-[28px]">
        다음 단계
      </h2>
      <p className="mt-2 max-w-2xl text-[15px] text-slate-600">
        1차 입지검토 이후 사업 확정을 위한 권장 진행 순서입니다.
      </p>

      <ol className="mt-6 grid gap-4 sm:grid-cols-3">
        {STEPS.map((step) => (
          <li
            key={step.num}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_2px_8px_rgba(11,29,58,0.04)]"
          >
            <p className="text-xs font-bold tracking-wide text-sky-600">{step.num}</p>
            <p className="mt-2 text-lg font-extrabold text-slate-900">{step.title}</p>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{step.description}</p>
          </li>
        ))}
      </ol>

      <div className="mt-6">
        <Link href="#consultation" className="btn-primary inline-flex h-12 items-center px-6 text-sm font-bold">
          무료 전문가 상담 신청
        </Link>
      </div>
    </section>
  );
}
