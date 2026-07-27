"use client";

import { useEffect, useState } from "react";
import ConsultationForm from "@/components/result/ConsultationForm";
import type { ConsultationAnalysisContext } from "@/types/consultation";

interface ResultConsultationModalProps {
  open: boolean;
  onClose: () => void;
  defaultAddress: string;
  analysisContext?: ConsultationAnalysisContext;
  searchHistoryId?: string;
}

export default function ResultConsultationModal({
  open,
  onClose,
  defaultAddress,
  analysisContext,
  searchHistoryId,
}: ResultConsultationModalProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-stretch justify-end bg-black/50" role="dialog" aria-modal="true">
      <button type="button" className="absolute inset-0" aria-label="닫기" onClick={onClose} />
      <div
        className={`relative z-10 flex w-full flex-col bg-white shadow-xl ${
          isMobile ? "h-full max-w-none" : "h-full max-w-[460px]"
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-extrabold text-navy">무료 전문가 상담</h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-6">
          <ConsultationForm
            defaultAddress={defaultAddress}
            analysisContext={analysisContext}
            searchHistoryId={searchHistoryId}
          />
        </div>
      </div>
    </div>
  );
}
