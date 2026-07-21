import Image from "next/image";
import Link from "next/link";
import { company } from "@/data/sampleData";

interface SgSolarLogoProps {
  size?: "sm" | "md" | "lg";
  variant?: "dark" | "light";
  showTagline?: boolean;
  className?: string;
}

/** Header: mobile 32px / desktop 44px (40–48). lg ≈ 48px. */
const heights = {
  sm: "h-8 sm:h-11",
  md: "h-11",
  lg: "h-12",
} as const;

export default function SgSolarLogo({
  size = "md",
  variant = "dark",
  showTagline = false,
  className = "",
}: SgSolarLogoProps) {
  const isLight = variant === "light";

  return (
    <Link href="/" className={`inline-flex flex-col items-start gap-1 ${className}`}>
      <Image
        src="/brand/sg-solar-logo.png"
        alt="SG SOLAR"
        width={640}
        height={320}
        priority={size !== "sm"}
        className={`${heights[size]} w-auto object-contain ${isLight ? "" : "invert"}`}
      />
      {showTagline ? (
        <p
          className={`text-[10px] font-semibold leading-tight tracking-wide sm:text-xs ${
            isLight ? "text-slate-300" : "text-slate-600"
          }`}
        >
          {company.companyName}
        </p>
      ) : null}
    </Link>
  );
}
