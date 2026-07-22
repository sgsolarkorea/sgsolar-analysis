"use client";

import Link from "next/link";
import PdfDownloadButton from "@/components/result/PdfDownloadButton";

export default function MobileResultActions({ address }: { address: string }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 p-3 backdrop-blur md:hidden">
      <div className="mx-auto flex max-w-lg gap-2">
        <div className="min-w-0 flex-1">
          <PdfDownloadButton address={address} variant="mobile" />
        </div>
        <Link
          href="#consultation"
          className="btn-primary inline-flex h-11 shrink-0 items-center justify-center px-4 text-sm font-bold"
        >
          상담 신청
        </Link>
      </div>
    </div>
  );
}
