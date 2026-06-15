import { company } from "@/data/sampleData";
import Link from "next/link";

interface SgSolarLogoProps {
  size?: "sm" | "md" | "lg";
  variant?: "dark" | "light";
  showTagline?: boolean;
}

const sizes = {
  sm: { icon: "h-9 w-9", brand: "text-base", sub: "text-[10px]" },
  md: { icon: "h-10 w-10", brand: "text-xl", sub: "text-xs" },
  lg: { icon: "h-12 w-12", brand: "text-2xl", sub: "text-sm" },
};

export default function SgSolarLogo({
  size = "md",
  variant = "dark",
  showTagline = false,
}: SgSolarLogoProps) {
  const s = sizes[size];
  const isLight = variant === "light";

  return (
    <Link href="/" className="inline-flex items-center gap-2.5">
      <div
        className={`${s.icon} flex shrink-0 items-center justify-center rounded-lg ${
          isLight ? "bg-white/20 ring-1 ring-white/30" : "bg-navy"
        }`}
      >
        <svg viewBox="0 0 32 32" className="h-[55%] w-[55%]" aria-hidden>
          <circle cx="16" cy="16" r="5" fill="#ffffff" />
          <g stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round">
            <line x1="16" y1="3" x2="16" y2="7" />
            <line x1="16" y1="25" x2="16" y2="29" />
            <line x1="3" y1="16" x2="7" y2="16" />
            <line x1="25" y1="16" x2="29" y2="16" />
          </g>
        </svg>
      </div>
      <div className="min-w-0">
        <p
          className={`${s.brand} font-bold leading-none tracking-tight ${
            isLight ? "text-white" : "text-slate-900"
          }`}
        >
          {company.brandName}
        </p>
        {showTagline && (
          <p
            className={`${s.sub} mt-1 font-medium leading-tight ${
              isLight ? "text-slate-200" : "text-slate-600"
            }`}
          >
            {company.companyName}
          </p>
        )}
      </div>
    </Link>
  );
}
