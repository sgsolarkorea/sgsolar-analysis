import { NextResponse } from "next/server";
import { lookupParcelByAddress } from "@/lib/api/parcelLookup";
import { getKakaoErrorMessage } from "@/lib/api/kakaoErrors";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { address?: string } | null;
  const address = body?.address?.trim();

  if (!address) {
    return NextResponse.json({ error: "address required" }, { status: 400 });
  }

  try {
    const parcel = await lookupParcelByAddress(address);
    return NextResponse.json({ parcel });
  } catch (error) {
    return NextResponse.json({ error: getKakaoErrorMessage(error) }, { status: 400 });
  }
}
