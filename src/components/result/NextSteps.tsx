import Link from "next/link";

const STEPS = [
  { num: "01", title: "현장 확인", description: "음영·구조·진입 여건 확인", active: true },
  { num: "02", title: "계통 확인", description: "한전 접속 가능 여부 검토", active: true },
  { num: "03", title: "실시설계", description: "모듈 배치·용량 확정", active: true },
  { num: "04", title: "설치", description: "시공 및 준공", active: false },
] as const;

export default function NextSteps() {
  return (
    <section id="next-steps" className="scroll-mt-28" aria-labelledby="next-steps-heading">
      <h2 id="next-steps-heading" className="text-[26px] font-extrabold text-navy sm:text-[28px]">
        다음 단계
      </h2>
      <p className="mt-2 max-w-2xl text-[15px] text-slate-600">
        1차 입지검토 이후 사업 확정을 위한 권장 진행 순서입니다.
      </p>

      <ol className="mt-8 flex flex-col gap-0 sm:flex-row sm:items-stretch">
        {STEPS.map((step, index) => (
          <li key={step.num} className="flex flex-1 items-stretch">
            <div
              className={`flex w-full flex-col rounded-2xl border px-4 py-5 ${
                step.active
                  ? "border-slate-200 bg-white"
                  : "border-dashed border-slate-200 bg-slate-50/80 opacity-70"
              }`}
            >
              <p className={`text-xs font-bold ${step.active ? "text-sky-600" : "text-slate-400"}`}>
                {step.num}
              </p>
              <p className="mt-2 text-lg font-extrabold text-slate-900">{step.title}</p>
              <p className="mt-1 text-sm text-slate-600">{step.description}</p>
            </div>
            {index < STEPS.length - 1 ? (
              <div className="hidden w-6 shrink-0 items-center justify-center sm:flex" aria-hidden>
                <span className="h-px w-full bg-slate-300" />
              </div>
            ) : null}
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
