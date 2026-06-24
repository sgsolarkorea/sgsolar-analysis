"use client";

import { useState } from "react";
import { company } from "@/data/sampleData";
import { CONSULTATION_INSTALL_TYPE_OPTIONS } from "@/types/siteReview";
import type { ConsultationAnalysisContext } from "@/types/consultation";
import { useResultMetrics } from "@/components/result/ResultMetricsProvider";
import { buildPdfApiUrl } from "@/lib/leads/downloadPdf";

interface ConsultationFormProps {
  defaultAddress?: string;
  analysisContext?: ConsultationAnalysisContext;
  searchHistoryId?: string;
}

export default function ConsultationForm({
  defaultAddress = "",
  analysisContext,
  searchHistoryId,
}: ConsultationFormProps) {
  const { parcels } = useResultMetrics();
  const hasMultiParcel = parcels.length > 1;
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: defaultAddress,
    installType: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/consultation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          resultPageUrl: window.location.href,
          pdfUrl: buildPdfApiUrl(form.address || defaultAddress, hasMultiParcel),
          analysisContext,
          ...(searchHistoryId ? { searchHistoryId } : {}),
        }),
      });

      const data = (await res.json()) as { error?: string };

      if (!res.ok) {
        throw new Error(data.error ?? "상담 신청에 실패했습니다.");
      }

      alert(
        `상담 신청이 접수되었습니다. ${company.companyName} 담당자가 확인 후 연락드리겠습니다.${
          form.email.trim() ? " 입력하신 이메일로 접수 확인 메일이 발송됩니다." : ""
        }`,
      );
      setForm({
        name: "",
        phone: "",
        email: "",
        address: defaultAddress,
        installType: "",
        message: "",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "상담 신청에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section id="consultation" className="scroll-mt-24">
      <div className="card-premium overflow-hidden">
        <div className="bg-navy px-5 py-5 sm:px-8 sm:py-6">
          <h2 className="text-lg font-bold text-white sm:text-xl">전문가 무료 컨설팅 신청</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-100">
            입지검토 결과를 바탕으로 {company.companyName} 담당자가 설치 가능성, 예상 견적, 한전
            접수, 인허가 절차를 안내드립니다.
          </p>
          <p className="mt-2 text-xs text-slate-200 sm:text-sm">
            상담 문의: {company.phone} · {company.email}
          </p>
          <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-200">
            <span>✓ 상담 비용 없음</span>
            <span>✓ 담당자 직접 연락</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-4 p-5 sm:grid-cols-2 sm:gap-5 sm:p-8">
          <div>
            <label htmlFor="name" className="mb-1.5 block text-sm font-semibold text-slate-900">
              이름 <span className="text-red-600">*</span>
            </label>
            <input
              id="name"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="input-field"
              placeholder="홍길동"
            />
          </div>
          <div>
            <label htmlFor="phone" className="mb-1.5 block text-sm font-semibold text-slate-900">
              연락처 <span className="text-red-600">*</span>
            </label>
            <input
              id="phone"
              required
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="input-field"
              placeholder="010-0000-0000"
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="email" className="mb-1.5 block text-sm font-semibold text-slate-900">
              이메일 <span className="text-slate-400 font-normal">(선택 · 접수 확인 메일 발송)</span>
            </label>
            <input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="input-field"
              placeholder="example@email.com"
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="address" className="mb-1.5 block text-sm font-semibold text-slate-900">
              설치 희망 주소 <span className="text-red-600">*</span>
            </label>
            <input
              id="address"
              required
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="input-field"
              placeholder="시공 희망 주소를 입력해 주세요"
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="installType" className="mb-1.5 block text-sm font-semibold text-slate-900">
              설치 유형 선택
            </label>
            <select
              id="installType"
              value={form.installType}
              onChange={(e) => setForm({ ...form, installType: e.target.value })}
              className="input-field"
            >
              {CONSULTATION_INSTALL_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value || "placeholder"} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="message" className="mb-1.5 block text-sm font-semibold text-slate-900">
              문의내용
            </label>
            <textarea
              id="message"
              rows={4}
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              className="input-field h-auto py-3"
              placeholder="설치 희망 용량, 예산, 일정 등 문의사항을 입력해 주세요."
            />
          </div>
          <div className="sm:col-span-2">
            {error && (
              <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary h-12 w-full text-base font-bold disabled:cursor-not-allowed disabled:opacity-60 sm:h-14"
            >
              {isSubmitting ? "접수 중..." : "무료 컨설팅 상담 신청하기"}
            </button>
            <p className="mt-3 text-center text-xs text-slate-500">
              입력하신 정보는 상담 목적으로만 사용되며, 제3자에게 제공되지 않습니다.
            </p>
          </div>
        </form>
      </div>
    </section>
  );
}
