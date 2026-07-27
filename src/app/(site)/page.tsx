import AddressSearchForm from "@/components/home/AddressSearchForm";
import SgSolarLogo from "@/components/brand/SgSolarLogo";
import { MARKETING_NAME } from "@/data/sampleData";

const features = [
  {
    title: "입지 적합성 검토",
    description:
      "주소 기반으로 토지·건축물 정보를 확인하고 태양광 설치 가능성을 1차 분석합니다.",
    bullets: ["토지·건축물 정보", "조례 및 이격거리", "설치 가능 면적"],
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.75}
          d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
        />
      </svg>
    ),
  },
  {
    title: "발전량·수익성 분석",
    description: "예상 설치용량, 발전량, 시공비용, 예상 수익을 종합적으로 검토합니다.",
    bullets: ["예상 설치용량", "연간 발전량", "예상 수익"],
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.75}
          d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
        />
      </svg>
    ),
  },
  {
    title: "전문가 컨설팅",
    description: "검토 결과를 바탕으로 설치 방식, 인허가, 한전 접수 절차를 안내합니다.",
    bullets: ["설치 방식", "계통연계", "인허가 절차"],
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.75}
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </svg>
    ),
  },
];

const trustItems = [
  {
    label: "공공데이터 기반",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
      </svg>
    ),
  },
  {
    label: "설치용량 산정",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  },
  {
    label: "발전량·수익성 분석",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
  },
  {
    label: "전문가 상담 연계",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

const previewKpis = [
  { label: "예상 설치용량", unit: "kW" },
  { label: "예상 발전량", unit: "kWh" },
  { label: "예상 수익성", unit: "원" },
];

export default function HomePage() {
  return (
    <>
      <section className="relative overflow-hidden bg-navy">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          aria-hidden
          style={{
            backgroundImage:
              "linear-gradient(rgba(125,211,252,0.9) 1px, transparent 1px), linear-gradient(90deg, rgba(125,211,252,0.9) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
            maskImage: "radial-gradient(ellipse 70% 80% at 75% 40%, black, transparent 75%)",
          }}
        />
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden
          style={{
            background:
              "radial-gradient(ellipse 55% 50% at 18% 35%, rgba(14, 48, 92, 0.55), transparent 70%), radial-gradient(ellipse 45% 40% at 88% 20%, rgba(56, 189, 248, 0.08), transparent 60%)",
          }}
        />

        <div className="site-shell relative flex min-h-[600px] items-center py-12 sm:min-h-[640px] sm:py-14 lg:min-h-[680px] lg:py-16">
          <div className="grid w-full items-center gap-14 lg:grid-cols-[minmax(0,1.2fr)_minmax(340px,0.8fr)] lg:gap-16 xl:gap-[4.5rem]">
            <div className="flex max-w-[700px] flex-col items-start">
              <SgSolarLogo layout="hero" variant="light" />

              <span className="mt-6 inline-flex h-9 w-fit items-center gap-2 rounded-[10px] border border-sky-400/30 bg-white/[0.07] px-4 text-[13px] font-semibold text-white sm:text-sm">
                <svg className="h-4 w-4 shrink-0 text-sky-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span className="text-sky-100">무료 입지검토</span>
                <span className="text-white/40" aria-hidden>
                  ·
                </span>
                <span className="text-slate-200">상담 비용 없음</span>
              </span>

              <h1 className="mt-[18px] max-w-[680px] text-[40px] font-extrabold leading-[1.12] tracking-[-0.02em] text-white sm:text-[50px] lg:text-[56px]">
                무료 태양광 입지검토
              </h1>

              <p className="mt-5 max-w-[670px] text-[17px] leading-[1.65] text-slate-100 sm:text-[18px]">
                {MARKETING_NAME}는 태양광 발전사업의{" "}
                <span className="font-semibold text-sky-200">20년 생애주기 경험</span>을 바탕으로{" "}
                <span className="font-semibold text-sky-200">입지검토</span>부터 설계·인허가·시공·유지관리까지
                사업 가능성을 분석합니다.
              </p>

              <div className="mt-8 w-full sm:mt-9">
                <AddressSearchForm />
              </div>

              <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-3">
                {trustItems.map((item) => (
                  <li
                    key={item.label}
                    className="inline-flex items-center gap-2 text-[13px] font-medium text-slate-300 sm:text-sm"
                  >
                    <span className="text-sky-300">{item.icon}</span>
                    {item.label}
                  </li>
                ))}
              </ul>
            </div>

            <aside className="w-full self-stretch lg:flex lg:flex-col">
              <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-white/12 bg-white/[0.07] shadow-[0_12px_40px_rgba(0,0,0,0.22)] backdrop-blur-sm">
                <div className="border-b border-white/10 px-5 py-4 sm:px-7 sm:py-5">
                  <p className="text-[15px] font-bold text-white">주소 하나로 확인하는 입지분석</p>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-slate-300">
                    위치·면적·설치규모·발전량·수익성을 단계별로 분석합니다.
                  </p>
                </div>

                <div className="relative mx-5 mt-4 aspect-[16/10] overflow-hidden rounded-xl border border-white/15 bg-[#0a2744] sm:mx-7 sm:mt-5 sm:aspect-[4/3]">
                  <div
                    className="absolute inset-0 opacity-40"
                    style={{
                      backgroundImage:
                        "linear-gradient(rgba(56,189,248,0.25) 1px, transparent 1px), linear-gradient(90deg, rgba(56,189,248,0.25) 1px, transparent 1px)",
                      backgroundSize: "22px 22px",
                    }}
                    aria-hidden
                  />
                  <div
                    className="absolute inset-[18%] rounded-lg border-2 border-sky-300/80 bg-sky-400/15"
                    aria-hidden
                  />
                  <div className="absolute left-1/2 top-[42%] -translate-x-1/2 -translate-y-1/2" aria-hidden>
                    <span className="block h-3.5 w-3.5 rounded-full border-2 border-white bg-amber-400 shadow-md" />
                  </div>
                  <div className="absolute bottom-3 left-3 right-3 rounded-lg border border-white/15 bg-navy/75 px-3 py-2 backdrop-blur-sm">
                    <p className="truncate text-[11px] font-medium text-slate-200">분석 예시 · 부지 경계</p>
                    <p className="mt-0.5 text-[12px] font-semibold text-white">주소 입력 후 실제 필지 경계 표시</p>
                  </div>
                </div>

                <div className="mt-auto grid grid-cols-3 gap-2 px-5 py-4 sm:px-7 sm:py-5">
                  {previewKpis.map((kpi) => (
                    <div
                      key={kpi.label}
                      className="rounded-xl border border-white/10 bg-white/[0.05] px-2.5 py-3 text-center"
                    >
                      <p className="text-[11px] font-medium leading-snug text-slate-300">{kpi.label}</p>
                      <p className="mt-1.5 text-[12px] font-bold text-sky-200/90">분석 예시 · {kpi.unit}</p>
                    </div>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <section className="site-shell py-16 sm:py-20">
        <div className="mb-8 max-w-2xl sm:mb-10">
          <h2 className="text-2xl font-extrabold tracking-tight text-navy sm:text-[28px]">
            입지검토에서 확인하는 항목
          </h2>
          <p className="mt-3 text-[15px] leading-[1.65] text-slate-600 sm:text-base">
            주소와 공개 데이터를 기준으로 설치 가능성과 예상 사업성을 단계별로 검토합니다.
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-7">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="group flex min-h-[240px] flex-col rounded-2xl border border-slate-200 bg-white p-8 shadow-[0_2px_8px_rgba(11,29,58,0.06)] transition duration-200 hover:-translate-y-[3px] hover:border-sky-400/50 hover:shadow-[0_10px_28px_rgba(11,29,58,0.1)] sm:min-h-[250px] sm:p-[30px]"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-navy text-white">
                  {feature.icon}
                </span>
                <span className="text-sm font-bold text-slate-400">{String(index + 1).padStart(2, "0")}</span>
              </div>
              <h3 className="mt-5 text-[20px] font-extrabold leading-snug text-slate-900 sm:text-[21px]">
                {feature.title}
              </h3>
              <p className="mt-3 text-[15px] leading-[1.65] text-slate-600 sm:text-base">
                {feature.description}
              </p>
              <ul className="mt-auto space-y-2 pt-5">
                {feature.bullets.map((bullet) => (
                  <li key={bullet} className="flex items-start gap-2 text-[13px] font-medium text-slate-600 sm:text-sm">
                    <svg className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    {bullet}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
