import Link from "next/link";
import type { ReactNode } from "react";
import {
  formatReferenceDataMonth,
  gradeHeroPresentation,
  pickHeroMetricBars,
} from "@/lib/result/heroDisplay";
import type { Grade, SuitabilityItem } from "@/types/siteReview";

interface ResultHeroProps {
  address: string;
  jibunAddress: string;
  buildingName?: string;
  analyzedAt: string;
  grade: Grade;
  recommendation: string;
  suitability: SuitabilityItem[];
}

function MetaCard({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 backdrop-blur-sm">
      <div className="flex items-start gap-2">
        <div className="mt-0.5 text-sky-300">{icon}</div>
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400 sm:text-[11px]">
            {label}
          </p>
          <p className="mt-0.5 text-xs font-semibold leading-snug text-white sm:text-sm">{value}</p>
        </div>
      </div>
    </div>
  );
}

function ScoreRing({ letter, score }: { letter: string; score: number }) {
  const dash = `${score * 0.94} 100`;

  return (
    <div className="relative mx-auto h-28 w-28 shrink-0 sm:h-32 sm:w-32">
      <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90" aria-hidden>
        <circle cx="18" cy="18" r="15.5" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="2.5" />
        <circle
          cx="18"
          cy="18"
          r="15.5"
          fill="none"
          stroke="#10B981"
          strokeWidth="2.5"
          strokeLinecap="round"
          pathLength={100}
          strokeDasharray={dash}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-2xl font-bold tracking-tight text-white sm:text-3xl">{letter}</span>
        <span className="mt-0.5 text-[11px] font-medium text-slate-300 sm:text-xs">
          {score} / 100
        </span>
      </div>
    </div>
  );
}

export default function ResultHero({
  address,
  jibunAddress,
  buildingName,
  analyzedAt,
  grade,
  recommendation,
  suitability,
}: ResultHeroProps) {
  const presentation = gradeHeroPresentation(grade);
  const metricBars = pickHeroMetricBars(suitability);
  const installTypeLabel = recommendation.split("(")[0]?.trim() || recommendation;

  return (
    <div id="address-check" className="result-hero scroll-mt-24">
      <div className="result-hero-pattern pointer-events-none absolute inset-0" aria-hidden />
      <div className="result-hero-glow pointer-events-none absolute inset-0" aria-hidden />

      <div className="relative mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:py-10">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-200">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
            입지 분석 완료
          </span>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm transition hover:bg-white/10"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            다시 검색
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)] lg:gap-8">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold leading-tight tracking-tight text-white sm:text-3xl lg:text-[2rem]">
              {address}
            </h1>
            {(jibunAddress !== address || buildingName) && (
              <p className="mt-2 text-sm text-slate-300">
                {jibunAddress}
                {buildingName ? ` · ${buildingName}` : ""}
              </p>
            )}

            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-200 sm:text-[15px]">
              AI 기반 입지검토를 완료했습니다. {presentation.summary}
            </p>

            <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
              <MetaCard
                label="추천 유형"
                value={installTypeLabel}
                icon={
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                }
              />
              <MetaCard
                label="분석 일시"
                value={analyzedAt}
                icon={
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                }
              />
              <MetaCard
                label="분석 버전"
                value="v2.1.0"
                icon={
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h10" />
                  </svg>
                }
              />
              <MetaCard
                label="참고 데이터"
                value={formatReferenceDataMonth(analyzedAt)}
                icon={
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                }
              />
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-md sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-bold text-white">입지 종합 평점</p>
              <span className="rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-medium text-slate-300">
                1차 검토
              </span>
            </div>

            <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row sm:items-start">
              <ScoreRing letter={presentation.letter} score={presentation.score} />
              <div className="w-full min-w-0 flex-1 space-y-2.5">
                {metricBars.map((bar) => (
                  <div key={bar.label}>
                    <div className="mb-1 flex items-center justify-between gap-2 text-[11px]">
                      <span className="font-medium text-slate-300">{bar.label}</span>
                      <span className="font-semibold text-white">{bar.score}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-sky-400 transition-all"
                        style={{ width: `${bar.score}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <p className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-emerald-300">
              <span className="text-emerald-400">◆</span>
              {presentation.accent}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
