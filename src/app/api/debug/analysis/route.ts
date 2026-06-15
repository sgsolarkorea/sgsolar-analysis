import { NextResponse } from "next/server";
import { analyzeSolarSite } from "@/lib/api/analysis";
import { getKakaoErrorMessage } from "@/lib/api/kakaoErrors";
import { resolveInfoDataSource } from "@/lib/api/infoFallbacks";
import { extractAreasForDebug } from "@/lib/solar/debug";

export const dynamic = "force-dynamic";

/** Production 진단용 — result 페이지와 동일한 analyzeSolarSite 결과 요약 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address")?.trim() ?? "";

  if (!address) {
    return NextResponse.json({ error: "address 파라미터가 필요합니다." }, { status: 400 });
  }

  try {
    const data = await analyzeSolarSite(address);
    const areas = extractAreasForDebug(data.landInfo, data.buildingInfo);

    return NextResponse.json(
      {
        address: data.address,
        jibunAddress: data.jibunAddress,
        pnu: data.pnu,
        buildingArea: areas.buildingArea,
        landArea: areas.landArea,
        buildingAreaRaw: areas.buildingAreaRaw,
        landAreaRaw: areas.landAreaRaw,
        defaultInstallType: data.solarMetrics.installType,
        estimatedCapacity: data.profitability.estimatedCapacity,
        capacityKw: data.solarMetrics.capacityKw,
        baseAreaSqm: data.solarMetrics.baseAreaSqm,
        baseAreaLabel: data.solarMetrics.baseAreaLabel,
        buildingDataSource: resolveInfoDataSource(data.buildingInfo, "건축면적"),
        landDataSource: resolveInfoDataSource(data.landInfo, "면적"),
        contextSync: {
          overviewCapacity: data.capacity,
          revenueEstimatedCapacity: data.profitability.estimatedCapacity,
          metricsCapacityKw: data.solarMetrics.capacityKw,
          valuesMatch:
            data.capacity === data.profitability.estimatedCapacity &&
            data.profitability.estimatedCapacity.includes(
              String(data.solarMetrics.capacityKw),
            ),
        },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return NextResponse.json({ error: getKakaoErrorMessage(error) }, { status: 500 });
  }
}
