interface SectionHeaderProps {
  title: string;
  description?: string;
}

export default function SectionHeader({ title, description }: SectionHeaderProps) {
  return (
    <div className="mb-4 sm:mb-5">
      <h2 className="border-l-4 border-navy pl-3 text-lg font-bold text-slate-900 sm:text-xl">
        {title}
      </h2>
      {description && <p className="mt-1 text-sm text-slate-600">{description}</p>}
    </div>
  );
}
