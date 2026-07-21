import Link from "next/link";
import { company } from "@/data/sampleData";

/** Trimmed web assets — padding removed from 500×500 source canvas. */
export const BRAND_LOGO_MARK_SRC = "/brand/sg-logo-mark-web.png";
export const BRAND_LOGO_WORDMARK_SRC = "/brand/sg-solar-logo-web.png";

const MARK_SIZE = { width: 276, height: 68 } as const;
const WORDMARK_SIZE = { width: 276, height: 101 } as const;

export type SgSolarLogoLayout = "header" | "hero" | "footer" | "compact";

interface SgSolarLogoProps {
  layout?: SgSolarLogoLayout;
  variant?: "dark" | "light";
  showTagline?: boolean;
  className?: string;
}

/** Display heights target visible SG symbol, not outer box. */
const layoutConfig: Record<
  SgSolarLogoLayout,
  {
    src: string;
    intrinsic: { width: number; height: number };
    imageClass: string;
    blockClass: string;
    taglineClass: string;
    inlineTagline?: boolean;
  }
> = {
  header: {
    src: BRAND_LOGO_MARK_SRC,
    intrinsic: MARK_SIZE,
    imageClass: "h-[26px] w-auto sm:h-[30px]",
    blockClass: "inline-flex shrink-0 items-center",
    taglineClass: "",
  },
  hero: {
    src: BRAND_LOGO_MARK_SRC,
    intrinsic: MARK_SIZE,
    imageClass: "h-[48px] w-auto sm:h-[52px]",
    blockClass: "inline-flex items-center gap-3.5 sm:gap-4",
    taglineClass: "text-[15px] font-semibold tracking-[0.08em] text-white sm:text-base",
    inlineTagline: true,
  },
  footer: {
    src: BRAND_LOGO_MARK_SRC,
    intrinsic: MARK_SIZE,
    imageClass: "h-[38px] w-auto sm:h-[42px]",
    blockClass: "inline-flex flex-col items-start gap-2.5",
    taglineClass: "text-base font-bold tracking-wide text-white sm:text-lg",
  },
  compact: {
    src: BRAND_LOGO_MARK_SRC,
    intrinsic: MARK_SIZE,
    imageClass: "h-[30px] w-auto",
    blockClass: "inline-flex shrink-0 items-center",
    taglineClass: "",
  },
};

export default function SgSolarLogo({
  layout = "header",
  variant = "dark",
  showTagline = false,
  className = "",
}: SgSolarLogoProps) {
  const isLight = variant === "light";
  const config = layoutConfig[layout];
  const imageClass = `${config.imageClass} max-w-none object-contain ${
    isLight ? "" : "invert"
  }`;

  const logoImage = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={config.src}
      alt="SG SOLAR"
      width={config.intrinsic.width}
      height={config.intrinsic.height}
      decoding="async"
      className={imageClass}
    />
  );

  return (
    <Link href="/" className={`${config.blockClass} ${className}`}>
      {logoImage}
      {showTagline ? (
        config.inlineTagline ? (
          <span className={config.taglineClass}>{company.companyName}</span>
        ) : (
          <p className={config.taglineClass}>{company.companyName}</p>
        )
      ) : null}
    </Link>
  );
}
