import { company, MARKETING_NAME, SITE_DISCLAIMER } from "@/data/sampleData";
import SgSolarLogo from "@/components/brand/SgSolarLogo";

export default function Footer() {
  const companyItems = [
    { label: "회사명", value: company.companyName },
    { label: "대표자", value: company.ceo },
    { label: "이메일", value: company.email },
    { label: "전화", value: company.phone },
    { label: "팩스", value: company.fax },
    { label: "사업자등록번호", value: company.businessNumber },
    { label: "통신판매업신고", value: company.mailOrderNumber },
  ];

  return (
    <footer className="mt-auto border-t border-slate-700 bg-navy text-white">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-12">
        <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
          <div>
            <SgSolarLogo size="sm" variant="light" showTagline />
          </div>
          <dl className="grid gap-x-8 gap-y-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
            {companyItems.map((item) => (
              <div key={item.label}>
                <dt className="text-xs font-semibold text-slate-400">{item.label}</dt>
                <dd className="mt-1 break-keep font-medium leading-snug text-white">{item.value}</dd>
              </div>
            ))}
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
