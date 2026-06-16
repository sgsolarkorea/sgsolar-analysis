"use client";

interface AdminNavProps {
  active: "search-history" | "ordinances" | "grid-data";
}

const LINKS = [
  { id: "search-history" as const, href: "/admin/search-history", label: "조회 이력" },
  { id: "ordinances" as const, href: "/admin/ordinances", label: "조례 학습" },
  { id: "grid-data" as const, href: "/admin/grid-data", label: "계통 데이터" },
];

export default function AdminNav({ active }: AdminNavProps) {
  return (
    <nav className="mb-6 flex flex-wrap gap-2">
      {LINKS.map((link) => (
        <a
          key={link.id}
          href={link.href}
          className={`inline-flex h-10 items-center rounded-lg px-4 text-sm font-semibold transition-colors ${
            active === link.id
              ? "bg-navy text-white"
              : "border border-slate-300 bg-white text-slate-800 hover:bg-slate-50"
          }`}
        >
          {link.label}
        </a>
      ))}
    </nav>
  );
}
