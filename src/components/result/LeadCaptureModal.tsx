"use client";

import { useEffect, useState } from "react";

export type LeadCaptureVariant = "pdf_download" | "consultation" | "save_result";

interface LeadCaptureModalProps {
  open: boolean;
  variant: LeadCaptureVariant;
  title: string;
  description: string;
  address: string;
  installType?: string;
  estimatedCapacityKw?: number;
  resultUrl?: string;
  pdfUrl?: string;
  searchHistoryId?: string;
  analysisContext?: Record<string, unknown>;
  onClose: () => void;
  onSuccess: () => void;
}

export default function LeadCaptureModal({
  open,
  variant,
  title,
  description,
  address,
  installType,
  estimatedCapacityKw,
  resultUrl,
  pdfUrl,
  searchHistoryId,
  analysisContext,
  onClose,
  onSuccess,
}: LeadCaptureModalProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (variant === "save_result") {
      setName("");
      setEmail("");
      setMessage("");
    }
  }, [open, variant]);

  if (!open) return null;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadType: variant,
          name: variant === "save_result" ? undefined : name,
          phone,
          email: variant === "save_result" ? undefined : email || undefined,
          address,
          installType,
          estimatedCapacityKw,
          resultUrl: resultUrl ?? (typeof window !== "undefined" ? window.location.href : undefined),
          pdfUrl,
          message: variant === "consultation" ? message : undefined,
          searchHistoryId,
          analysisContext,
        }),
      });

      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "접수에 실패했습니다.");
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "접수에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-900/50 p-4 sm:items-center">
      <div
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="lead-capture-title"
      >
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 id="lead-capture-title" className="text-lg font-bold text-slate-900">
            {title}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">{description}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-5 py-4">
          {variant !== "save_result" && (
            <div>
              <label htmlFor="lead-name" className="mb-1.5 block text-sm font-semibold text-slate-900">
                이름 <span className="text-red-600">*</span>
              </label>
              <input
                id="lead-name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-field"
                placeholder="홍길동"
              />
            </div>
          )}

          <div>
            <label htmlFor="lead-phone" className="mb-1.5 block text-sm font-semibold text-slate-900">
              연락처 <span className="text-red-600">*</span>
            </label>
            <input
              id="lead-phone"
              required
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="input-field"
              placeholder="010-0000-0000"
            />
          </div>

          {variant === "pdf_download" && (
            <div>
              <label htmlFor="lead-email" className="mb-1.5 block text-sm font-semibold text-slate-900">
                이메일 <span className="font-normal text-slate-400">(선택)</span>
              </label>
              <input
                id="lead-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="example@email.com"
              />
            </div>
          )}

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="h-11 flex-1 rounded-lg border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary h-11 flex-1 text-sm font-bold disabled:opacity-60"
            >
              {submitting ? "처리 중..." : variant === "pdf_download" ? "PDF 받기" : "저장하기"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
