import { NextResponse } from "next/server";
import { parseJibunLot } from "@/lib/api/jibunParser";
import { fetchLegalDongCodesByCoord, searchAddressByKakao } from "@/lib/api/kakao";
import { getKakaoErrorMessage } from "@/lib/api/kakaoErrors";
import { hasLandRecord } from "@/lib/api/infoFallbacks";
import { buildPnu } from "@/lib/api/pnu";
import { diagnoseVworldForSite } from "@/lib/api/vworld";
import type { InfoField } from "@/types/siteReview";

export const dynamic = "force-dynamic";

/** Production VWorld 진단용 (개발/운영 확인) */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address")?.trim() ?? "";

  if (!address) {
    return NextResponse.json({ error: "address 파라미터가 필요합니다." }, { status: 400 });
  }

  try {
    const geo = await searchAddressByKakao(address);
    const lot = parseJibunLot(geo.jibunAddress);
    const legalDong = await fetchLegalDongCodesByCoord(geo.lat, geo.lng);
    const pnuFallback =
      lot && legalDong
        ? buildPnu({
            sigunguCd: legalDong.sigunguCd,
            bjdongCd: legalDong.bjdongCd,
            platGbCd: lot.platGbCd,
            bun: lot.bun,
            ji: lot.ji,
          })
        : null;

    const vworld = await diagnoseVworldForSite(geo.lat, geo.lng, pnuFallback);
    const landByPnu = vworld.landByPnu as { landInfo: InfoField[] } | null;
    const landByCoords = vworld.landByCoordinates as { landInfo: InfoField[] };
    const resolvedLandInfo =
      landByPnu && hasLandRecord(landByPnu.landInfo) ? landByPnu.landInfo : landByCoords.landInfo;

    return NextResponse.json(
      {
        address: geo.address,
        jibunAddress: geo.jibunAddress,
        lat: geo.lat,
        lng: geo.lng,
        pnuFallback,
        vworld,
        landInfoResolved: hasLandRecord(resolvedLandInfo),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return NextResponse.json({ error: getKakaoErrorMessage(error) }, { status: 500 });
  }
}
