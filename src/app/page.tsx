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
        <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-16">
          <SgSolarLogo size="lg" variant="light" showTagline />
          <div className="mt-6 max-w-2xl">
            <span className="inline-flex rounded-full border border-slate-400 bg-slate-700 px-4 py-1.5 text-sm font-medium text-white">
              무료 입지검토 · 상담 비용 없음
            </span>
            <h1 className="mt-4 text-3xl font-bold leading-tight text-white sm:text-4xl">
              무료 태양광 입지검토
            </h1>
            <p className="mt-3 text-base leading-relaxed text-slate-100 sm:text-lg">
              {MARKETING_NAME}는 태양광 발전사업의 20년 생애주기 경험을 바탕으로 입지검토부터
              설계·인허가·시공·유지관리까지 사업 가능성을 분석합니다.
            </p>
          </div>
          <div className="mt-6 max-w-2xl">
            <AddressSearchForm />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="grid gap-4 sm:grid-cols-3">
          {features.map((feature, i) => (
            <div key={feature.title} className="card-premium p-6">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy text-sm font-bold text-white">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-4 font-bold text-slate-900">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
