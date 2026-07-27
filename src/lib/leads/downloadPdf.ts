import { parcelToSnapshot } from "@/lib/parcels/aggregate";
import {
  loadInvestmentScenario,
  type InvestmentScenarioPayload,
} from "@/lib/investment/scenarioStorage";

export async function downloadResultPdf(
  address: string,
  parcels: ReturnType<typeof parcelToSnapshot>[],
) {
  const investmentScenario = loadInvestmentScenario();
  const res = await fetch("/api/report/pdf", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      address,
      parcels: parcels.length > 0 ? parcels : undefined,
      investmentScenario: investmentScenario ?? undefined,
    }),
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    const detail = body && typeof body.error === "string" ? body.error : null;
    throw new Error(detail ?? "PDF 생성에 실패했습니다.");
  }

  const blob = await res.blob();
  const disposition = res.headers.get("Content-Disposition") ?? "";
  const match = disposition.match(/filename="?([^";]+)"?/);
  const filename = match?.[1] ?? "sgsolar-site-review.pdf";
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function buildPdfApiUrl(address: string, _hasMultiParcel: boolean): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/api/report/pdf?${new URLSearchParams({ address }).toString()}`;
}

export type { InvestmentScenarioPayload };
