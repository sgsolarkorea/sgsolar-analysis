"use client";

import type { OrdinanceDisplayPolicy, OrdinanceDisplayResult, OrdinanceInfoListResult } from "@/types/regulatoryReview";
import type { OrdinanceLoadMeta } from "@/types/ordinanceLearning";
import { ORDINANCE_DISPLAY_LABELS } from "@/types/ordinanceLearning";
import SectionHeader from "@/components/ui/SectionHeader";
import OrdinanceInfoCard from "@/components/result/OrdinanceInfoCard";
import OrdinanceInfoTable from "@/components/result/OrdinanceInfoTable";
import UrbanOrdinanceNoticePanel from "@/components/result/UrbanOrdinanceNoticePanel";

interface LocalOrdinanceSectionProps {
  display: OrdinanceDisplayResult;
  meta: OrdinanceLoadMeta;
  ordinanceInfo: OrdinanceInfoListResult;
}

function formatReviewDate(iso?: string): string {
  if (!iso) return "—";
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(new Date(iso))
    .replace(/\./g, "-")
    .replace(/\s/g, "")
    .replace(/-$/, "");
}

function resolveBadgeStatus(
  policy: OrdinanceDisplayPolicy,
  meta: OrdinanceLoadMeta,
): keyof typeof ORDINANCE_DISPLAY_LABELS {
  if (policy.displayStatus === "urban_review_required") return "urban_review_required";
  if (policy.displayStatus === "manual_verified") return "manual_verified";
  if (policy.displayStatus === "manual_pending") return "manual_pending";
  if (policy.displayStatus === "manual_review") return "manual_review";
  if (policy.displayStatus === "candidate") return "candidate";
  if (!meta.isPreparing && meta.displayStatus === "verified") return "verified";
  return meta.displayStatus;
}

const BADGE_STYLES: Record<string, string> = {
  verified: "bg-emerald-50 text-emerald-800 border-emerald-200",
  ai_draft: "bg-violet-50 text-violet-800 border-violet-200",
  preparing: "bg-amber-50 text-amber-900 border-amber-200",
  default_template: "bg-slate-100 text-slate-700 border-slate-200",
  urban_review_required: "bg-indigo-50 text-indigo-800 border-indigo-200",
  manual_review: "bg-amber-50 text-amber-900 border-amber-200",
  manual_verified: "bg-emerald-50 text-emerald-800 border-emerald-200",
  manual_pending: "bg-amber-50 text-amber-900 border-amber-200",
  candidate: "bg-sky-50 text-sky-800 border-sky-200",
};

function DisplayStatusBadge({
  policy,
  meta,
}: {
  policy: OrdinanceDisplayPolicy;
  meta: OrdinanceLoadMeta;
}) {
  const status = resolveBadgeStatus(policy, meta);
  return (
    <span
      className={`inline-flex rounded-md border px-2.5 py-1 text-xs font-semibold ${BADGE_STYLES[status] ?? BADGE_STYLES.preparing}`}
    >
      {ORDINANCE_DISPLAY_LABELS[status]}
    </span>
  );
}

function OrdinancePreparingPanel({
  meta,
  policy,
}: {
  meta: OrdinanceLoadMeta;
  policy: OrdinanceDisplayPolicy;
}) {
  return (
    <div className="card-premium p-6 sm:p-8">
      <div className="flex flex-wrap items-center gap-2">
        <DisplayStatusBadge policy={policy} meta={meta} />
        <span className="text-sm font-semibold text-slate-900">{meta.municipalityLabel}</span>
      </div>
      <h3 className="mt-4 text-lg font-bold text-slate-900">
        해당 지자체 조례 세부 기준은 상담 시 확인합니다.
      </h3>
      <p className="mt-3 text-sm leading-relaxed text-slate-600">
        위 법·규제 분석은 공공 GIS 기준 1차 검토입니다. {meta.municipalityLabel} 조례·인허가
        세부 기준은 상담 시 함께 검토합니다.
      </p>
      {policy.reviewReason && (
        <p className="mt-3 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {policy.reviewReason}
        </p>
      )}
    </div>
  );
}

export default function LocalOrdinanceSection({ display, meta, ordinanceInfo }: LocalOrdinanceSectionProps) {
  const {
    policy,
    cards,
    municipalityLabel,
    parsedAt,
    manualVerifiedAt,
  } = display;
  const showUrbanNotice = policy.isUrbanMetro && policy.urbanNotice;
  const showPreparing = !showUrbanNotice && cards.length === 0 && meta.isPreparing;

  return (
    <>
      <section id="ordinance-info" className="scroll-mt-24">
        <div className="mb-3 rounded-xl border border-navy/15 bg-gradient-to-br from-sky-50/90 via-white to-white p-4 shadow-sm sm:mb-4 sm:p-5">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-md border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] font-bold tracking-wide text-sky-900 sm:text-xs">
              <svg
                aria-hidden
                className="h-3.5 w-3.5 shrink-0 text-sky-700"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              공식 법규 기반
            </span>
            <span className="text-[11px] font-semibold text-sky-800/80 sm:text-xs">
              조례 원문 바로가기
            </span>
          </div>
          <h2 className="border-l-[3px] border-navy pl-2.5 text-base font-bold text-slate-900 sm:text-lg">
            조례정보
          </h2>
          <p className="mt-2 text-sm font-medium leading-relaxed text-slate-700">
            해당 부지와 관련된{" "}
            <span className="font-semibold text-navy">공식 조례 정보</span>를 확인할 수 있습니다.
            법규명을 클릭하면{" "}
            <span className="font-semibold text-navy">조례 원문</span>까지 직접 연결되어 보다
            정확한 검토가 가능합니다.
          </p>
        </div>
        <OrdinanceInfoTable rows={ordinanceInfo.rows} />
        {ordinanceInfo.hasOfficialLinks && (
          <p className="mt-3 rounded-lg border border-amber-100 bg-amber-50/80 px-3 py-2.5 text-[11px] font-medium leading-relaxed text-amber-950 sm:text-xs">
            아래 조례는 사전 검토용 참고 자료입니다. 실제 인허가 기준은 조례 원문과 관할 지자체
            확인을 통해 검토해야 합니다.
          </p>
        )}
      </section>

      <section id="local-ordinance" className="scroll-mt-24">
      <SectionHeader
        title="지자체 조례 검토"
        description={
          showUrbanNotice
            ? "수도권·도시지역은 개발행위허가 및 설치 가능 여부 검토가 우선입니다."
            : "조례 원문 기준으로 주요 검토 항목을 요약했습니다. 세부 기준은 상담 시 원문과 함께 재확인합니다."
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
        <DisplayStatusBadge policy={policy} meta={meta} />
        <div className="text-sm text-slate-700">
          <span className="font-semibold text-slate-900">{municipalityLabel}</span>
          {manualVerifiedAt && (
            <span className="ml-2 text-slate-600">수동 검토 · {formatReviewDate(manualVerifiedAt)}</span>
          )}
          {parsedAt && (
            <span className="ml-2 text-slate-600">검토 기준일 · {parsedAt}</span>
          )}
          {meta.reviewedAt && !parsedAt && !manualVerifiedAt && (
            <span className="ml-2 text-slate-600">
              최종 검토일 {formatReviewDate(meta.reviewedAt)}
              {meta.version ? ` · v${meta.version}` : ""}
            </span>
          )}
        </div>
      </div>

      {showUrbanNotice && policy.urbanNotice && (
        <div className="mb-4">
          <UrbanOrdinanceNoticePanel notice={policy.urbanNotice} />
        </div>
      )}

      {showPreparing ? (
        <OrdinancePreparingPanel meta={meta} policy={policy} />
      ) : (
        <div className="space-y-4">
          {cards.map((card) => (
            <OrdinanceInfoCard key={card.id} card={card} />
          ))}
          {policy.manualOverrideNoticeLines && policy.manualOverrideNoticeLines.length > 0 && (
            <ul className="rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm leading-relaxed text-emerald-900">
              {policy.manualOverrideNoticeLines.map((line) => (
                <li key={line} className="list-inside list-disc">
                  {line}
                </li>
              ))}
            </ul>
          )}
          {(policy.displayStatus === "manual_review" || policy.displayStatus === "manual_pending") &&
            policy.reviewReason && (
            <p className="rounded-lg border border-amber-100 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900">
              {policy.reviewReason}
            </p>
          )}
        </div>
      )}
      </section>
    </>
  );
}
