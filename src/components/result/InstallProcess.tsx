import { MARKETING_NAME } from "@/data/sampleData";
import SectionHeader from "@/components/ui/SectionHeader";

const stepTemplates = [
  { step: "01", title: "입지검토", desc: "주소 기반 1차 입지 분석 및 등급 산출" },
  { step: "02", title: "현장 실사", desc: "전문가 현장 방문 및 정밀 측량" },
  { step: "03", title: "맞춤 설계", desc: "구조·일사량·계통 여유 기반 최적 설계" },
  { step: "04", title: "인허가", desc: "건축물대장·한전 연계 등 행정 절차 대행" },
  { step: "05", title: "시공", desc: "시공팀 현장 시공" },
  { step: "06", title: "운영·관리", desc: "발전량 모니터링 및 O&M 통합 관리" },
];

export default function InstallProcess() {
  return (
    <section>
      <SectionHeader
        title={`${MARKETING_NAME} 설치 프로세스`}
        description="입지검토부터 운영까지 원스톱으로 지원합니다."
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {stepTemplates.map((item) => (
          <div key={item.step} className="card-premium flex gap-4 p-5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy text-sm font-bold text-white">
              {item.step}
            </span>
            <div>
              <h4 className="font-bold text-slate-900">{item.title}</h4>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">
                {item.step === "02" || item.step === "05"
                  ? `${MARKETING_NAME} ${item.desc}`
                  : item.desc}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
