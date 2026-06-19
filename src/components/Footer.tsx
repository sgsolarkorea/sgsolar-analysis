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
              <dt className="text-slate-300">회사명</dt>
              <dd className="text-white">{company.companyName}</dd>
            </div>
            <div>
              <dt className="text-slate-300">대표자</dt>
              <dd className="text-white">{company.ceo}</dd>
            </div>
            <div>
              <dt className="text-slate-300">이메일</dt>
              <dd className="text-white">{company.email}</dd>
            </div>
            <div>
              <dt className="text-slate-300">전화</dt>
              <dd className="text-white">{company.phone}</dd>
            </div>
            <div>
              <dt className="text-slate-300">팩스</dt>
              <dd className="text-white">{company.fax}</dd>
            </div>
            <div>
              <dt className="text-slate-300">사업자등록번호</dt>
              <dd className="text-white">{company.businessNumber}</dd>
            </div>
            <div>
              <dt className="text-slate-300">통신판매업신고</dt>
              <dd className="text-white">{company.mailOrderNumber}</dd>
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
