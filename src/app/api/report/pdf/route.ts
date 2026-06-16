import { NextResponse } from "next/server";
import { analyzeSolarSite } from "@/lib/api/analysis";
import { getMarketPrice } from "@/lib/api/market";
import { getKakaoErrorMessage } from "@/lib/api/kakaoErrors";
import { generateSiteReviewPdf, siteReviewPdfFilename } from "@/lib/pdf/siteReviewPdf";
import {
  calculateSolarMetrics,
  formatCapacityDisplay,
  formatConstructionDisplay,
  formatGenerationDisplay,
  formatRevenueDisplay,
} from "@/lib/solar/calculate";
import type { ParcelSnapshot } from "@/types/parcelReview";

export const maxDuration = 60;

interface PdfPostBody {
  address: string;
  parcels?: ParcelSnapshot[];
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address")?.trim() ?? "";

  if (!address) {
    return NextResponse.json({ error: "address 파라미터가 필요합니다." }, { status: 400 });
  }

  try {
    const data = await analyzeSolarSite(address);
    const pdfBytes = await generateSiteReviewPdf(data);
    return pdfResponse(pdfBytes);
  } catch (error) {
    console.error("[PDF] generation failed:", error);
    const message = error instanceof Error ? error.message : getKakaoErrorMessage(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as PdfPostBody | null;
  const address = body?.address?.trim() ?? "";

  if (!address) {
    return NextResponse.json({ error: "address required" }, { status: 400 });
  }

  try {
    const data = await analyzeSolarSite(address);
    const parcels = body?.parcels ?? [];

    if (parcels.length > 1) {
      const totalAreaSqm = parcels.reduce((sum, parcel) => sum + parcel.areaSqm, 0);
      const market = data.solarMetrics.market ?? (await getMarketPrice());
      const calc = calculateSolarMetrics({
        installType: "토지형",
        landInfo: data.landInfo,
        buildingInfo: data.buildingInfo,
        market,
        overrideLandAreaSqm: totalAreaSqm,
        parcelCount: parcels.length,
      });

      data.capacity = formatCapacityDisplay(calc.capacityKw);
      data.annualGeneration = formatGenerationDisplay(calc.annualGenerationKwh);
      data.annualRevenue = formatRevenueDisplay(calc.totalRevenueWon);
      data.constructionCost = formatConstructionDisplay(calc.constructionCostWon);
      data.solarMetrics = calc.metrics;
      data.profitability = calc.profitability;
      data.monthlyGeneration = calc.monthlyGeneration;
    }

    const pdfBytes = await generateSiteReviewPdf(data, parcels.length > 0 ? parcels : undefined);
    return pdfResponse(pdfBytes);
  } catch (error) {
    console.error("[PDF] multi-parcel generation failed:", error);
    const message = error instanceof Error ? error.message : getKakaoErrorMessage(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function pdfResponse(pdfBytes: Uint8Array) {
  const filename = siteReviewPdfFilename();
  return new NextResponse(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
