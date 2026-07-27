"use client";

import { useEffect, useState } from "react";
import { scrollToSection } from "@/components/layout/ScrollLink";

const NAV = [
  { id: "site-location", label: "입지" },
  { id: "installation-size", label: "설치규모" },
  { id: "grid", label: "계통" },
  { id: "generation", label: "발전량" },
  { id: "market-revenue", label: "수익" },
  { id: "install-visual", label: "설치형태" },
  { id: "required-checks", label: "확인사항" },
  { id: "cases", label: "사례" },
] as const;

export default function ResultStickyNav() {
  const [activeId, setActiveId] = useState<string>(NAV[0].id);

  useEffect(() => {
    const ids = NAV.map((item) => item.id);
    const onScroll = () => {
      const marker = window.scrollY + 140;
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
      className="sticky top-[72px] z-30 border-b border-slate-200 bg-white/95 backdrop-blur"
    >
      <div className="mx-auto flex max-w-[1320px] gap-1 overflow-x-auto px-4 py-2 sm:px-6">
        {NAV.map((item) => {
          const active = activeId === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => scrollToSection(item.id)}
              className={`shrink-0 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                active ? "bg-navy text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
