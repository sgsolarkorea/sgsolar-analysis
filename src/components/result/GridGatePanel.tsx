"use client";

import type { ReactNode } from "react";

interface GridGatePanelProps {
  children: ReactNode;
}

/** Visual wrapper: grid as decision gate above generation/revenue. */
export default function GridGatePanel({ children }: GridGatePanelProps) {
  return (
    <div className="scroll-mt-28 rounded-2xl border border-sky-200/80 bg-gradient-to-br from-sky-50 to-white p-1 shadow-sm">
      <div className="rounded-[14px] bg-white/80 p-4 sm:p-6">{children}</div>
    </div>
  );
}
