import type { ReactNode } from "react";

interface ResultFrameProps {
  id: string;
  eyebrow?: string;
  title: string;
  intro?: string;
  children: ReactNode;
  /** dark = full-bleed navy canvas; muted = soft slate band; default = open white */
  tone?: "default" | "muted" | "dark";
  className?: string;
}

/**
 * Decision Frame chrome — not a nested card gallery.
 * Spacing/rhythm only; content composition stays in children.
 */
export default function ResultFrame({
  id,
  eyebrow,
  title,
  intro,
  children,
  tone = "default",
  className = "",
}: ResultFrameProps) {
  const shell =
    tone === "dark"
      ? "bg-navy text-white"
      : tone === "muted"
        ? "bg-[#EFF4FA]"
        : "bg-transparent";

  const titleClass =
    tone === "dark"
      ? "text-[34px] font-extrabold tracking-tight text-white sm:text-[40px]"
      : "text-[34px] font-extrabold tracking-tight text-navy sm:text-[40px]";

  const introClass =
    tone === "dark"
      ? "mt-2 max-w-3xl text-[16px] leading-relaxed text-slate-300 sm:text-[17px]"
      : "mt-2 max-w-3xl text-[16px] leading-relaxed text-slate-600 sm:text-[17px]";

  const eyebrowClass =
    tone === "dark"
      ? "text-xs font-bold uppercase tracking-[0.14em] text-sky-300"
      : "text-xs font-bold uppercase tracking-[0.14em] text-sky-700";

  return (
    <section id={id} className={`result-frame scroll-mt-28 ${shell} ${className}`}>
      <div className="result-frame-inner mx-auto max-w-[1360px] px-4 sm:px-6">
        <header className="mb-8 sm:mb-10">
          {eyebrow ? <p className={eyebrowClass}>{eyebrow}</p> : null}
          <h2 className={`${eyebrow ? "mt-2" : ""} ${titleClass}`}>{title}</h2>
          {intro ? <p className={introClass}>{intro}</p> : null}
        </header>
        {children}
      </div>
    </section>
  );
}
