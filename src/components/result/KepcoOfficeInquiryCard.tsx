"use client";

import {
  KEPCO_INQUIRY_TOPICS,
  KEPCO_PREP_ITEMS,
  KEPCO_SUPPLEMENTARY_GUIDE,
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

function BulletList({ items }: { items: readonly string[] }) {
  return (
    <ul className="mt-2 space-y-1.5">
      {items.map((item) => (
        <li key={item} className="flex gap-2 text-sm leading-snug text-slate-700">
          <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-navy/60" aria-hidden />
          <span>{item}</span>
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

  return (
    <div className="rounded-2xl border border-navy/15 bg-gradient-to-b from-white to-slate-50/80 p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
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

      <div className="mt-5 space-y-4">
        <div>
          <p className="text-xs font-semibold text-slate-500">관할 한전 사업소</p>
          <p className="mt-1 text-lg font-bold text-navy">{office.officeName}</p>
          <p className="mt-1.5 text-xs font-medium text-slate-600">
            매칭 기준: {office.matchBasisLabel}
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
            주소 파싱: {office.parsedMeta}
          </p>
          {office.verificationNote && (
            <p className="mt-1 text-xs leading-relaxed text-amber-800">{office.verificationNote}</p>
          )}
        </div>

        <div>
          <p className="text-xs font-semibold text-slate-500">문의 부서</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">{office.departmentHint}</p>
        </div>

        <div>
          <p className="text-xs font-semibold text-slate-500">문의 항목</p>
          <BulletList items={KEPCO_INQUIRY_TOPICS} />
        </div>

        <div>
          <p className="text-xs font-semibold text-slate-500">문의 전 준비사항</p>
          <BulletList items={KEPCO_PREP_ITEMS} />
        </div>
      </div>

      {office.inquiryGuide && (
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-950">
          {office.inquiryGuide}
        </p>
      )}

      <div className="mt-4 border-t border-slate-200 pt-4">
        <p className="text-xs font-semibold text-slate-500">보조 연락수단</p>
        <p className="mt-1 text-sm text-slate-700">
          한전 대표번호{" "}
          <span className="font-bold text-navy">국번없이 {office.representativePhone}</span>
        </p>
        <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{KEPCO_SUPPLEMENTARY_GUIDE}</p>
      </div>
    </div>
  );
}
