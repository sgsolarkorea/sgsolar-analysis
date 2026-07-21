import { company, MARKETING_NAME, SITE_DISCLAIMER } from "@/data/sampleData";
import SgSolarLogo from "@/components/brand/SgSolarLogo";

const footerColumns = [
  [
    { label: "회사명", value: company.companyName },
    { label: "전화", value: company.phone },
    { label: "통신판매업신고", value: company.mailOrderNumber },
  ],
  [
    { label: "대표자", value: company.ceo },
    { label: "팩스", value: company.fax },
  ],
  [
    { label: "이메일", value: company.email },
    { label: "사업자등록번호", value: company.businessNumber },
  ],
] as const;

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-slate-700 bg-navy text-white">
      <div className="site-shell py-10 sm:py-12">
        <div className="grid gap-10 lg:grid-cols-[minmax(220px,280px)_1fr] lg:gap-12">
          <div className="max-w-xs">
            <SgSolarLogo layout="footer" variant="light" showTagline />
            <p className="mt-4 text-sm leading-relaxed text-slate-300">
              태양광 입지검토 · 발전사업 컨설팅
            </p>
          </div>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {footerColumns.map((column, columnIndex) => (
              <dl key={columnIndex} className="space-y-4">
                {column.map((item) => (
                  <div key={item.label}>
                    <dt className="text-[13px] font-semibold text-slate-400">{item.label}</dt>
                    <dd className="mt-1 break-keep text-[15px] font-semibold leading-snug text-white sm:text-base">
                      {item.value}
                    </dd>
                  </div>
                ))}
              </dl>
            ))}
          </div>
        </div>

        <p className="mt-8 max-w-none rounded-xl border border-slate-600 bg-slate-800 px-5 py-5 text-sm leading-[1.7] text-slate-100 sm:px-6 sm:text-[15px]">
          {SITE_DISCLAIMER}
        </p>

        <div className="mt-6 border-t border-slate-700 pt-6 text-xs text-slate-400 sm:text-sm">
          @2005. {MARKETING_NAME}. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
