import { NextResponse } from "next/server";
import { analyzeSolarSite } from "@/lib/api/analysis";
import { getKakaoErrorMessage } from "@/lib/api/kakaoErrors";
import { generateSiteReviewPdf, siteReviewPdfFilename } from "@/lib/pdf/siteReviewPdf";

export const maxDuration = 60;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address")?.trim() ?? "";

  if (!address) {
    return NextResponse.json({ error: "address 파라미터가 필요합니다." }, { status: 400 });
  }

  try {
    const data = await analyzeSolarSite(address);
    const pdfBytes = await generateSiteReviewPdf(data);
    const filename = siteReviewPdfFilename();

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[PDF] generation failed:", error);
    const message = error instanceof Error ? error.message : getKakaoErrorMessage(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
