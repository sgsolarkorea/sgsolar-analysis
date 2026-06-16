import { createHash } from "crypto";
import { municipalityToSlug } from "@/lib/regulatory/loadOrdinance";

export function createOrdinanceSlug(municipalityLabel: string): string {
  const mapped = municipalityToSlug(municipalityLabel);
  if (mapped !== "_default") return mapped;

  const hash = createHash("sha256").update(municipalityLabel, "utf8").digest("hex").slice(0, 10);
  return `auto-${hash}`;
}

export function extractFullRegionName(address: string, municipalityLabel: string): string {
  const trimmed = address.trim();
  const provinceMatch = trimmed.match(/^([^\s]+(?:특별자치도|광역시|특별시|도))\s/);
  if (provinceMatch?.[1]) {
    return `${provinceMatch[1]} ${municipalityLabel}`;
  }
  return municipalityLabel;
}
