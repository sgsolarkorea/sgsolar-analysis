"use client";

import { scrollToSection } from "@/components/layout/ScrollLink";

export default function FloatingConsultButton() {
  return (
    <>
      {/* 모바일: 하단 고정 */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white/95 p-3 shadow-[0_-4px_24px_rgba(0,0,0,0.15)] backdrop-blur-sm md:hidden">
        <button
          type="button"
          onClick={() => scrollToSection("consultation")}
          className="btn-primary h-12 w-full text-base"
        >
          무료 컨설팅 상담 신청하기
        </button>
      </div>

      <button
        type="button"
        onClick={() => scrollToSection("consultation")}
        className="btn-primary fixed bottom-6 right-6 z-50 hidden h-12 items-center gap-2 rounded-full px-7 text-sm shadow-xl ring-2 ring-white/80 md:inline-flex"
      >
        무료 상담 신청
      </button>
    </>
  );
}
