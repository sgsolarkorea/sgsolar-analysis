"use client";

import type { ReactNode } from "react";
import {
  KEPCO_INQUIRY_CALL_GUIDE,
  KEPCO_INQUIRY_TOPICS,
  KEPCO_PREP_ITEMS,
} from "@/lib/kepco/inquiryContent";
import { resolveKepcoOffice } from "@/lib/kepco/resolveKepcoOffice";

interface KepcoOfficeInquiryCardProps {
  address: string;
  jibunAddress?: string;
}

const STATUS_BADGE: Record<string, string> = {
  "주소 1차 매칭": "bg-emerald-50 text-emerald-800 border-emerald-200",
  "관할 확인 권장": "bg-amber-50 text-amber-900 border-amber-200",
  "확인 필요": "bg-slate-100 text-slate-700 border-slate-200",
};

function FieldBlock({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <div className="mt-1 min-w-0">{children}</div>
    </div>
  );
}

function BulletList({ items }: { items: readonly string[] }) {
  return (
    <ul className="mt-1 space-y-1.5">
      {items.map((item) => (
        <li key={item} className="flex gap-2 text-sm leading-snug text-slate-700">
          <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-navy/60" aria-hidden />
          <span className="min-w-0 break-words">{item}</span>
        </li>
      ))}
    </ul>
  );
}

export default function KepcoOfficeInquiryCard({
  address,
  jibunAddress = "",
}: KepcoOfficeInquiryCardProps) {
  const office = resolveKepcoOffice(address, jibunAddress);
  const badgeClass = STATUS_BADGE[office.statusLabel] ?? STATUS_BADGE["확인 필요"];
  const officePhoneTel = office.officePhone?.replace(/[^\d+]/g, "");

  return (
    <div className="min-w-0 overflow-hidden rounded-2xl border border-navy/15 bg-gradient-to-b from-white to-slate-50/80 p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            관할 한전 사업소 문의
          </p>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            공공 계통 1차 검토 기준 · 실제 접속 가능용량은 관할 한전 확인이 필요합니다.
          </p>
        </div>
        <span
          className={`inline-flex shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${badgeClass}`}
        >
          {office.statusLabel}
        </span>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 lg:gap-4">
        <div className="min-w-0 space-y-4">
          <FieldBlock label="관할 사업소">
            <p className="text-lg font-bold text-navy break-words">{office.officeName}</p>
          </FieldBlock>

          <FieldBlock label="지사 대표번호">
            {officePhoneTel ? (
              <a
                href={`tel:${officePhoneTel}`}
                className="text-base font-bold text-navy underline-offset-2 hover:underline break-all"
              >
                {office.officePhoneDisplay}
              </a>
            ) : (
              <p className="text-base font-bold text-slate-600">{office.officePhoneDisplay}</p>
            )}
          </FieldBlock>

          <FieldBlock label="보조 연락수단">
            <p className="text-sm font-semibold text-slate-800">
              한전{" "}
              <span className="font-bold text-navy">{office.fallbackPhone}</span>
            </p>
          </FieldBlock>

          <FieldBlock label="매칭 기준">
            <p className="text-sm font-medium text-slate-700 break-words">{office.matchBasisLabel}</p>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-400 break-words">
              기준 행정구역: {office.parsedMeta}
            </p>
            {office.verificationNote && (
              <p className="mt-1 text-xs leading-relaxed text-amber-800 break-words">
                {office.verificationNote}
              </p>
            )}
          </FieldBlock>
        </div>

        <div className="min-w-0 space-y-4">
          <FieldBlock label="문의 부서">
            <p className="text-sm font-semibold text-slate-900 break-words">{office.departmentHint}</p>
          </FieldBlock>

          <FieldBlock label="문의 항목">
            <BulletList items={KEPCO_INQUIRY_TOPICS} />
          </FieldBlock>
        </div>

        <div className="min-w-0 md:col-span-2 lg:col-span-1">
          <FieldBlock label="문의 전 준비사항">
            <BulletList items={KEPCO_PREP_ITEMS} />
          </FieldBlock>
        </div>
      </div>

      {office.inquiryGuide && (
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-950 break-words">
          {office.inquiryGuide}
        </p>
      )}

      <p className="mt-4 rounded-lg border border-slate-200 bg-white/80 px-3 py-2.5 text-xs leading-relaxed text-slate-700 break-words">
        {KEPCO_INQUIRY_CALL_GUIDE}
      </p>
    </div>
  );
}
