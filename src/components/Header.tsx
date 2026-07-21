import Link from "next/link";
import SgSolarLogo from "@/components/brand/SgSolarLogo";
import ScrollLink from "@/components/layout/ScrollLink";

const navItems = [
  { label: "입지검토", href: "/" },
  { label: "수익성 계산", href: "#profitability" },
  { label: "시공사례", href: "#cases" },
  { label: "상담신청", href: "#consultation" },
];

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/90 bg-white/95 shadow-sm backdrop-blur-sm">
      <div className="site-shell flex h-[80px] items-center justify-between gap-4 sm:h-[84px] sm:gap-6 lg:h-[88px]">
        <div className="min-w-0 shrink-0">
          <span className="lg:hidden">
            <SgSolarLogo layout="mobileHeader" variant="dark" />
          </span>
          <span className="hidden lg:inline-flex">
            <SgSolarLogo layout="header" variant="dark" />
          </span>
        </div>

        <nav
          className="hidden flex-1 items-center justify-center gap-9 xl:gap-10 lg:flex"
          aria-label="주요 메뉴"
        >
          {navItems.map((item) =>
            item.href.startsWith("/") ? (
              <Link
                key={item.label}
                href={item.href}
                className="text-[15px] font-semibold text-slate-800 transition-colors hover:text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy/30 focus-visible:ring-offset-2 xl:text-base"
              >
                {item.label}
              </Link>
            ) : (
              <ScrollLink
                key={item.label}
                href={item.href}
                className="text-[15px] font-semibold text-slate-800 transition-colors hover:text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy/30 focus-visible:ring-offset-2 xl:text-base"
              >
                {item.label}
              </ScrollLink>
            ),
          )}
        </nav>

        <ScrollLink
          href="#consultation"
          className="btn-primary h-11 shrink-0 rounded-xl px-4 text-sm font-bold shadow-md sm:h-12 sm:px-6 sm:text-[15px]"
        >
          <span className="sm:hidden">무료 상담</span>
          <span className="hidden sm:inline">무료 컨설팅 상담 신청하기</span>
        </ScrollLink>
      </div>
    </header>
  );
}
