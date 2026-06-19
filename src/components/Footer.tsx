import { company, MARKETING_NAME, SITE_DISCLAIMER } from "@/data/sampleData";
import SgSolarLogo from "@/components/brand/SgSolarLogo";

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-slate-700 bg-navy text-white">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-12">
        <div className="grid gap-8 sm:grid-cols-2">
          <div>
            <SgSolarLogo size="sm" variant="light" showTagline />
          </div>
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-slate-300">대표</dt>
              <dd className="text-white">{company.ceo}</dd>
            </div>
            <div>
              <dt className="text-slate-300">사업장 주소</dt>
              <dd className="text-white">{company.address}</dd>
            </div>
            <div>
              <dt className="text-slate-300">대표번호</dt>
              <dd className="text-white">{company.phone}</dd>
            </div>
          </dl>
        </div>

        <p className="mt-8 rounded-lg border border-slate-600 bg-slate-800 px-4 py-3 text-xs leading-relaxed text-slate-100 sm:text-sm">
          {SITE_DISCLAIMER}
        </p>

        <div className="mt-6 border-t border-slate-700 pt-6 text-xs text-slate-400">
          @2005. {MARKETING_NAME}. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
