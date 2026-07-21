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
        <div className="site-shell flex min-h-[560px] items-center py-12 sm:min-h-[600px] sm:py-14 lg:min-h-[640px] lg:py-16">
          <div className="grid w-full items-center gap-12 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] lg:gap-14 xl:gap-16">
            <div className="max-w-[720px]">
              <SgSolarLogo layout="hero" variant="light" />

              <span className="mt-7 inline-flex rounded-full border border-slate-400/80 bg-slate-700/80 px-4 py-2 text-sm font-medium text-white">
                무료 입지검토 · 상담 비용 없음
              </span>

              <h1 className="mt-5 max-w-[680px] text-[36px] font-extrabold leading-[1.15] tracking-tight text-white sm:text-[48px] lg:text-[52px]">
                무료 태양광 입지검토
              </h1>

              <p className="mt-5 max-w-[670px] text-[17px] leading-[1.65] text-slate-100 sm:text-[18px]">
                {MARKETING_NAME}는 태양광 발전사업의 20년 생애주기 경험을 바탕으로 입지검토부터
                설계·인허가·시공·유지관리까지 사업 가능성을 분석합니다.
              </p>

              <div className="mt-8 sm:mt-9">
                <AddressSearchForm />
              </div>
            </div>

            <aside className="hidden self-stretch rounded-2xl border border-white/10 bg-white/[0.06] p-8 backdrop-blur-sm lg:flex lg:flex-col xl:p-9">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-300">
                입지분석 프로세스
              </p>
              <ul className="mt-7 flex flex-1 flex-col justify-center gap-6">
                {features.map((feature, index) => (
                  <li key={feature.title} className="flex min-h-[72px] gap-4">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 text-sm font-bold text-white">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[17px] font-bold leading-snug text-white">{feature.title}</p>
                      <p className="mt-1.5 text-[15px] leading-[1.65] text-slate-300">
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

      <section className="site-shell py-16 sm:py-20">
        <div className="mb-8 max-w-2xl sm:mb-10">
          <h2 className="text-2xl font-extrabold tracking-tight text-navy sm:text-[28px]">
            입지검토 프로세스
          </h2>
          <p className="mt-3 text-[15px] leading-[1.65] text-slate-600 sm:text-base">
            주소 입력만으로 설치 가능성·용량·수익성을 1차 검토하고, 전문가 상담으로 이어집니다.
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-7">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="flex min-h-[230px] flex-col rounded-2xl border border-slate-200 bg-white p-8 shadow-[0_2px_8px_rgba(11,29,58,0.06)] sm:min-h-[240px] sm:p-8"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-navy text-[15px] font-bold text-white">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-5 text-[19px] font-extrabold leading-snug text-slate-900 sm:text-[20px]">
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
