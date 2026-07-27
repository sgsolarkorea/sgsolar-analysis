import { NextResponse } from "next/server";
import { getCachedAnalyzeSolarSite } from "@/lib/api/analysis";
import {
  KakaoAddressNotFoundError,
  getKakaoErrorMessage,
} from "@/lib/api/kakaoErrors";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address")?.trim();
  const phase = searchParams.get("phase") === "core" ? "core" : "full";

  if (!address) {
    return NextResponse.json({ error: "address required" }, { status: 400 });
  }

  try {
    await getCachedAnalyzeSolarSite(address, { phase });
    return NextResponse.json({ ok: true, phase });
  } catch (error) {
    const message = getKakaoErrorMessage(error);
    const status = error instanceof KakaoAddressNotFoundError ? 404 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
