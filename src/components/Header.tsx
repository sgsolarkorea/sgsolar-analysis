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
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white shadow-sm">
      <div className="mx-auto flex h-[68px] max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
        <SgSolarLogo size="sm" showTagline />

        <nav className="hidden items-center gap-1 md:flex">
          {navItems.map((item) =>
            item.href.startsWith("/") ? (
              <Link
                key={item.label}
                href={item.href}
                className="px-3 py-2 text-sm font-medium text-slate-700 hover:text-navy"
              >
                {item.label}
              </Link>
            ) : (
              <ScrollLink
                key={item.label}
                href={item.href}
                className="px-3 py-2 text-sm font-medium text-slate-700 hover:text-navy"
              >
                {item.label}
              </ScrollLink>
            ),
          )}
        </nav>

        <ScrollLink href="#consultation" className="btn-primary h-10 shrink-0 px-4 text-sm sm:px-5">
          무료 상담 신청
        </ScrollLink>
      </div>
    </header>
  );
}
