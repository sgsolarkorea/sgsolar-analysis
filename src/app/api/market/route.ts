import { NextResponse } from "next/server";
import { getMarketPrice } from "@/lib/api/market";

export const dynamic = "force-dynamic";

/** Non-blocking market enrichment for result page (shared daily data). */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address")?.trim() ?? "";
  const jibunAddress = searchParams.get("jibun")?.trim() ?? undefined;

  try {
    const data = await getMarketPrice({ address, jibunAddress });
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
      },
    });
  } catch (error) {
    console.error("[api/market]", error);
    return NextResponse.json({ error: "market_unavailable" }, { status: 502 });
  }
}
