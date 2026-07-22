import Link from "next/link";
import { MARKETING_NAME } from "@/data/sampleData";

/**
 * Official trimmed assets from public/brand/source/공식로고_1200x1200.png
 * Intrinsic content box after trim+padding: 761×295 (≈2.58:1)
 * - web: white logo on transparent (dark backgrounds)
 * - on-light: black logo on transparent (light backgrounds)
 * Dark-footer separate asset skipped — white logo already reads on navy.
 */
export const BRAND_LOGO_OFFICIAL_WEB = "/brand/sg-solar-official-web.png";
export const BRAND_LOGO_OFFICIAL_ON_LIGHT = "/brand/sg-solar-official-on-light.png";

const OFFICIAL_SIZE = { width: 761, height: 295 } as const;

export type SgSolarLogoLayout =
  | "header"
  | "mobileHeader"
  | "hero"
  | "loading"
  | "result"
  | "footer"
  | "pdf"
  | "print"
  | "admin"
  | "compact"
  | "fullWordmark";

interface SgSolarLogoProps {
  layout?: SgSolarLogoLayout;
  /** light = on dark UI surfaces; dark = on light UI surfaces */
  variant?: "dark" | "light";
  showTagline?: boolean;
  className?: string;
  /** When false, render image only (PDF/print wrappers). Default true. */
  link?: boolean;
}

const layoutConfig: Record<
  SgSolarLogoLayout,
  {
    imageClass: string;
    wrapperClass: string;
    taglineClass: string;
    stackTagline?: boolean;
  }
> = {
  header: {
    // height-led: aspect 2.58 → ~124–134px wide at 48–52px tall
    imageClass: "h-[42px] w-auto max-w-[200px] sm:h-[48px] sm:max-w-[220px]",
    wrapperClass: "inline-flex shrink-0 items-center overflow-visible py-1",
    taglineClass: "",
  },
  mobileHeader: {
    imageClass: "h-[36px] w-auto max-w-[160px]",
    wrapperClass: "inline-flex shrink-0 items-center overflow-visible py-1",
    taglineClass: "",
  },
  hero: {
    imageClass: "h-auto w-[210px] max-w-full sm:w-[250px] lg:w-[270px]",
    wrapperClass: "inline-flex flex-col items-start overflow-visible",
    taglineClass: "mt-3 text-[15px] font-semibold tracking-[0.08em] text-white sm:text-base",
    stackTagline: true,
  },
  loading: {
    imageClass: "h-auto w-[190px] max-w-[90vw] sm:w-[230px]",
    wrapperClass:
      "inline-flex shrink-0 items-center justify-center overflow-visible min-h-[72px] sm:min-h-[88px]",
    taglineClass: "",
  },
  result: {
    imageClass: "h-[36px] w-auto max-w-[160px]",
    wrapperClass: "inline-flex shrink-0 items-center overflow-visible",
    taglineClass: "",
  },
  footer: {
    imageClass: "h-auto w-[210px] max-w-full sm:w-[250px]",
    wrapperClass: "inline-flex flex-col items-start gap-3 overflow-visible",
    taglineClass: "text-base font-bold tracking-wide text-white sm:text-lg",
    stackTagline: true,
  },
  pdf: {
    imageClass: "h-auto w-[180px]",
    wrapperClass: "inline-flex shrink-0 items-center overflow-visible",
    taglineClass: "",
  },
  print: {
    imageClass: "h-auto w-[160px]",
    wrapperClass: "inline-flex shrink-0 items-center overflow-visible",
    taglineClass: "",
  },
  admin: {
    imageClass: "h-[40px] w-auto max-w-[180px]",
    wrapperClass: "inline-flex shrink-0 items-center overflow-visible",
    taglineClass: "",
  },
  compact: {
    imageClass: "h-[32px] w-auto max-w-[140px]",
    wrapperClass: "inline-flex shrink-0 items-center overflow-visible",
    taglineClass: "",
  },
  fullWordmark: {
    imageClass: "h-auto w-[220px] max-w-full sm:w-[260px]",
    wrapperClass: "inline-flex shrink-0 items-center overflow-visible",
    taglineClass: "",
  },
};

function resolveSrc(variant: "dark" | "light"): string {
  // light variant = shown on dark backgrounds → white logo
  // dark variant = shown on light backgrounds → black logo
  return variant === "light" ? BRAND_LOGO_OFFICIAL_WEB : BRAND_LOGO_OFFICIAL_ON_LIGHT;
}

export default function SgSolarLogo({
  layout = "header",
  variant = "dark",
  showTagline = false,
  className = "",
  link = true,
}: SgSolarLogoProps) {
  const config = layoutConfig[layout];
  const src = resolveSrc(variant);

  const logoImage = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt="SG SOLAR"
      width={OFFICIAL_SIZE.width}
      height={OFFICIAL_SIZE.height}
      decoding="async"
      className={`${config.imageClass} object-contain object-center`}
      style={{ flexShrink: 0 }}
    />
  );

  const content = (
    <>
      {logoImage}
      {showTagline ? (
        config.stackTagline ? (
          <p className={config.taglineClass}>{MARKETING_NAME}</p>
        ) : (
          <span className={config.taglineClass}>{MARKETING_NAME}</span>
        )
      ) : null}
    </>
  );

  if (!link) {
    return <div className={`${config.wrapperClass} ${className}`}>{content}</div>;
  }

  return <Link href="/" className={`${config.wrapperClass} ${className}`}>{content}</Link>;
}
