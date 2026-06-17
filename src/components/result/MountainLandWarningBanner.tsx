import { MOUNTAIN_LAND_WARNING_TEXT } from "@/lib/site/mountainLand";

export default function MountainLandWarningBanner() {
  return (
    <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 px-4 py-4 sm:px-5">
      <p className="whitespace-pre-line text-sm font-medium leading-relaxed text-amber-950">
        ⚠ {MOUNTAIN_LAND_WARNING_TEXT}
      </p>
    </div>
  );
}
