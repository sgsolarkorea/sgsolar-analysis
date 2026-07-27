"use client";

import { useEffect, useState } from "react";
import { scrollToSection } from "@/components/layout/ScrollLink";

const NAV = [
  { id: "frame-site", label: "입지" },
  { id: "frame-technical", label: "설치" },
  { id: "frame-feasibility", label: "사업검토" },
  { id: "frame-energy", label: "발전" },
  { id: "frame-business", label: "수익" },
  { id: "frame-action", label: "진행절차" },
  { id: "frame-proof", label: "설치예시" },
] as const;

export default function ResultStickyNav() {
  const [activeId, setActiveId] = useState<string>(NAV[0].id);

  useEffect(() => {
    const ids = NAV.map((item) => item.id);
    const onScroll = () => {
      const marker = window.scrollY + 120;
      let current = ids[0];
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.offsetTop <= marker) current = id;
      }
      setActiveId(current);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      aria-label="결과 섹션"
      className="sticky top-[72px] z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur"
    >
      <div className="mx-auto flex max-w-[1360px] gap-0 overflow-x-auto px-4 sm:px-6">
        {NAV.map((item) => {
          const active = activeId === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => scrollToSection(item.id)}
              className={`relative shrink-0 px-3 py-2.5 text-sm font-semibold transition sm:px-3.5 ${
                active ? "text-navy" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {item.label}
              {active ? (
                <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-sky-500" aria-hidden />
              ) : null}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
