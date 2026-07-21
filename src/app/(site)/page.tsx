import AddressSearchForm from "@/components/home/AddressSearchForm";
import SgSolarLogo from "@/components/brand/SgSolarLogo";
import { MARKETING_NAME } from "@/data/sampleData";

const features = [
  {
    title: "입지 적합성 검토",
    description:
      "주소 기반으로 토지·건축물 정보를 확인하고 태양광 설치 가능성을 1차 분석합니다.",
  },
  {
    title: "발전량·수익성 분석",
    description: "예상 설치용량, 발전량, 시공비용, 예상 수익을 종합적으로 검토합니다.",
  },
  {
    title: "전문가 컨설팅",
    description: "검토 결과를 바탕으로 설치 방식, 인허가, 한전 접수 절차를 안내합니다.",
  },
];

export default function HomePage() {
  return (
    <>
      <section className="bg-navy">
        <div className="site-shell flex min-h-[500px] items-center py-12 sm:min-h-[540px] sm:py-14 lg:py-16">
          <div className="grid w-full items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(300px,380px)] lg:gap-14 xl:gap-16">
            <div className="max-w-[700px]">
              <SgSolarLogo layout="hero" variant="light" showTagline />

              <span className="mt-6 inline-flex rounded-full border border-slate-400/80 bg-slate-700/80 px-4 py-2 text-sm font-medium text-white">
                무료 입지검토 · 상담 비용 없음
              </span>

              <h1 className="mt-5 text-[34px] font-extrabold leading-[1.18] tracking-tight text-white sm:text-[44px] lg:text-[48px]">
                무료 태양광 입지검토
              </h1>

              <p className="mt-4 max-w-[680px] text-[17px] leading-[1.65] text-slate-100 sm:text-lg">
                {MARKETING_NAME}는 태양광 발전사업의 20년 생애주기 경험을 바탕으로 입지검토부터
                설계·인허가·시공·유지관리까지 사업 가능성을 분석합니다.
              </p>

              <div className="mt-8">
                <AddressSearchForm />
              </div>
            </div>

            <aside className="hidden rounded-2xl border border-white/10 bg-white/[0.06] p-7 backdrop-blur-sm lg:block xl:p-8">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-300">
                입지분석 프로세스
              </p>
              <ul className="mt-6 space-y-5">
                {features.map((feature, index) => (
                  <li key={feature.title} className="flex gap-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-sm font-bold text-white">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[15px] font-bold leading-snug text-white">{feature.title}</p>
                      <p className="mt-1.5 text-sm leading-[1.65] text-slate-300">
                        {feature.description}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </aside>
          </div>
        </div>
      </section>

      <section className="site-shell py-10 sm:py-12">
        <div className="grid gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="flex min-h-[200px] flex-col rounded-2xl border border-slate-200 bg-white p-7 shadow-[0_2px_8px_rgba(11,29,58,0.06)] sm:min-h-[210px] sm:p-8"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy text-[15px] font-bold text-white">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-5 text-lg font-extrabold leading-snug text-slate-900 sm:text-xl">
                {feature.title}
              </h3>
              <p className="mt-3 text-[15px] leading-[1.65] text-slate-600 sm:text-base">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
