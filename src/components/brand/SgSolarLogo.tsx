import Link from "next/link";
import { company } from "@/data/sampleData";

/** Trimmed web assets — padding removed from 500×500 source canvas. */
export const BRAND_LOGO_MARK_SRC = "/brand/sg-logo-mark-web.png";
export const BRAND_LOGO_WORDMARK_SRC = "/brand/sg-solar-logo-web.png";

const MARK_SIZE = { width: 276, height: 68 } as const;
const WORDMARK_SIZE = { width: 276, height: 101 } as const;

export type SgSolarLogoLayout =
  | "header"
  | "hero"
  | "loading"
  | "footer"
  | "mobile"
  | "compact"
  | "fullWordmark";

interface SgSolarLogoProps {
  layout?: SgSolarLogoLayout;
  variant?: "dark" | "light";
  showTagline?: boolean;
  className?: string;
}

/** Each variant has independent sizing — do not reuse one height everywhere. */
const layoutConfig: Record<
  SgSolarLogoLayout,
  {
    src: string;
    intrinsic: { width: number; height: number };
    imageClass: string;
    wrapperClass: string;
    taglineClass: string;
    inlineTagline?: boolean;
  }
> = {
  header: {
    src: BRAND_LOGO_MARK_SRC,
    intrinsic: MARK_SIZE,
    imageClass: "h-[26px] w-auto max-w-[124px] sm:h-[30px]",
    wrapperClass: "inline-flex shrink-0 items-center overflow-visible py-1",
    taglineClass: "",
  },
  mobile: {
    src: BRAND_LOGO_MARK_SRC,
    intrinsic: MARK_SIZE,
    imageClass: "h-[24px] w-auto max-w-[108px] sm:h-[28px]",
    wrapperClass: "inline-flex shrink-0 items-center overflow-visible py-1",
    taglineClass: "",
  },
  hero: {
    src: BRAND_LOGO_MARK_SRC,
    intrinsic: MARK_SIZE,
    imageClass: "h-[46px] w-auto max-w-[200px] sm:h-[52px]",
    wrapperClass: "inline-flex items-center gap-3.5 overflow-visible sm:gap-4",
    taglineClass: "text-[15px] font-semibold tracking-[0.08em] text-white sm:text-base",
    inlineTagline: true,
  },
  loading: {
    src: BRAND_LOGO_MARK_SRC,
    intrinsic: MARK_SIZE,
    imageClass: "h-[36px] w-auto max-w-[180px] sm:h-[46px]",
    wrapperClass: "inline-flex shrink-0 items-center justify-center overflow-visible min-h-[56px] sm:min-h-[64px]",
    taglineClass: "",
  },
  footer: {
    src: BRAND_LOGO_WORDMARK_SRC,
    intrinsic: WORDMARK_SIZE,
    imageClass: "h-[34px] w-auto max-w-[170px] sm:h-[42px] sm:max-w-[190px]",
    wrapperClass: "inline-flex flex-col items-start gap-2.5 overflow-visible",
    taglineClass: "text-base font-bold tracking-wide text-white sm:text-lg",
  },
  fullWordmark: {
    src: BRAND_LOGO_WORDMARK_SRC,
    intrinsic: WORDMARK_SIZE,
    imageClass: "h-[38px] w-auto max-w-[180px] sm:h-[44px] sm:max-w-[200px]",
    wrapperClass: "inline-flex shrink-0 items-center overflow-visible",
    taglineClass: "",
  },
  compact: {
    src: BRAND_LOGO_MARK_SRC,
    intrinsic: MARK_SIZE,
    imageClass: "h-[28px] w-auto max-w-[120px]",
    wrapperClass: "inline-flex shrink-0 items-center overflow-visible",
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
  const imageClass = `${config.imageClass} object-contain object-center ${
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
      style={{ flexShrink: 0 }}
    />
  );

  return (
    <Link href="/" className={`${config.wrapperClass} ${className}`}>
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
