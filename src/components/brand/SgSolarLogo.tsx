import Link from "next/link";
import { company } from "@/data/sampleData";

/** Original PNG intrinsic size — display via pixel height + auto width (object-fit: contain). */
const LOGO_SRC = "/brand/sg-solar-logo.png";
const LOGO_WIDTH = 640;
const LOGO_HEIGHT = 320;

export type SgSolarLogoLayout = "header" | "hero" | "footer" | "compact";

interface SgSolarLogoProps {
  layout?: SgSolarLogoLayout;
  variant?: "dark" | "light";
  showTagline?: boolean;
  className?: string;
}

const layoutStyles: Record<
  SgSolarLogoLayout,
  { imageClass: string; taglineGap: string; taglineClass: string }
> = {
  header: {
    imageClass: "h-[36px] sm:h-[44px]",
    taglineGap: "gap-0",
    taglineClass: "text-[10px] sm:text-xs",
  },
  hero: {
    imageClass: "h-[80px]",
    taglineGap: "gap-3",
    taglineClass: "text-sm font-semibold tracking-wide sm:text-base",
  },
  footer: {
    imageClass: "h-[60px]",
    taglineGap: "gap-2.5",
    taglineClass: "text-xs font-semibold tracking-wide sm:text-sm",
  },
  compact: {
    imageClass: "h-11",
    taglineGap: "gap-1",
    taglineClass: "text-[10px] sm:text-xs",
  },
};

export default function SgSolarLogo({
  layout = "header",
  variant = "dark",
  showTagline = false,
  className = "",
}: SgSolarLogoProps) {
  const isLight = variant === "light";
  const styles = layoutStyles[layout];

  return (
    <Link
      href="/"
      className={`inline-flex flex-col items-start ${styles.taglineGap} ${className}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={LOGO_SRC}
        alt="SG SOLAR"
        width={LOGO_WIDTH}
        height={LOGO_HEIGHT}
        decoding="async"
        className={`w-auto max-w-none object-contain ${styles.imageClass} ${
          isLight ? "" : "invert"
        }`}
      />
      {showTagline ? (
        <p
          className={`leading-none ${styles.taglineClass} ${
            isLight ? "text-slate-300" : "text-slate-600"
          }`}
        >
          {company.companyName}
        </p>
      ) : null}
    </Link>
  );
}
