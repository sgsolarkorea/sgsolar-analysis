interface SectionHeaderProps {
  title: string;
  description?: string;
  compact?: boolean;
}

export default function SectionHeader({ title, description, compact = false }: SectionHeaderProps) {
  return (
    <div className={compact ? "mb-2 sm:mb-2.5" : "mb-3 sm:mb-4"}>
      <h2
        className={`border-l-[3px] border-navy pl-2.5 font-bold text-slate-900 ${
          compact ? "text-sm sm:text-base" : "text-base sm:text-lg"
        }`}
      >
        {title}
      </h2>
      {description && (
        <p
          className={`mt-0.5 font-medium text-slate-600 ${
            compact ? "text-[11px] leading-snug sm:text-xs" : "text-xs leading-relaxed sm:text-sm"
          }`}
        >
          {description}
        </p>
      )}
    </div>
  );
}
