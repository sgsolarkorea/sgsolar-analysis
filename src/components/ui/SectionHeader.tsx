interface SectionHeaderProps {
  title: string;
  description?: string;
  compact?: boolean;
}

export default function SectionHeader({ title, description, compact = false }: SectionHeaderProps) {
  return (
    <div className={compact ? "mb-3 sm:mb-4" : "mb-4 sm:mb-5"}>
      <h2
        className={`border-l-4 border-navy pl-3 font-bold text-slate-900 ${
          compact ? "text-base sm:text-lg" : "text-lg sm:text-xl"
        }`}
      >
        {title}
      </h2>
      {description && (
        <p
          className={`mt-1 font-medium text-slate-600 ${
            compact ? "text-xs leading-relaxed sm:text-sm" : "text-sm"
          }`}
        >
          {description}
        </p>
      )}
    </div>
  );
}
