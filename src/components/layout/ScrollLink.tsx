"use client";

interface ScrollLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
}

export function scrollToSection(id: string) {
  const el = document.getElementById(id);
  if (el) {
    const headerOffset = 80;
    const top = el.getBoundingClientRect().top + window.scrollY - headerOffset;
    window.scrollTo({ top, behavior: "smooth" });
    return;
  }
  window.location.href = `/result#${id}`;
}

export default function ScrollLink({ href, children, className }: ScrollLinkProps) {
  const id = href.startsWith("#") ? href.slice(1) : href;

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    scrollToSection(id);
  }

  return (
    <a href={href} onClick={handleClick} className={className}>
      {children}
    </a>
  );
}
