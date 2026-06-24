import { parcelToSnapshot } from "@/lib/parcels/aggregate";

export async function downloadResultPdf(address: string, parcels: ReturnType<typeof parcelToSnapshot>[]) {
  const hasMultiParcel = parcels.length > 1;
  const res = hasMultiParcel
    ? await fetch("/api/report/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address,
          parcels,
        }),
      })
    : await fetch(`/api/report/pdf?${new URLSearchParams({ address }).toString()}`);

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

export function buildPdfApiUrl(address: string, hasMultiParcel: boolean): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  if (hasMultiParcel) {
    return `${origin}/api/report/pdf`;
  }
  return `${origin}/api/report/pdf?${new URLSearchParams({ address }).toString()}`;
}
