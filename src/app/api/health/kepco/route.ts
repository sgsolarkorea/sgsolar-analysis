import { NextResponse } from "next/server";
import { debugKepcoDispersedGeneration } from "@/lib/grid/kepcoApi";
import { resolveGridConnection } from "@/lib/grid/resolve";

const DEFAULT_ADDRESS = "충청남도 아산시 염치읍 방현리 258-7";
const DEFAULT_PNU = "4420025031102580007";

/** KEPCO API 연동 진단 (API 키 값은 노출하지 않음) */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address")?.trim() || DEFAULT_ADDRESS;
  const pnu = searchParams.get("pnu")?.trim() || DEFAULT_PNU;

  const debug = await debugKepcoDispersedGeneration({ jibunAddress: address, pnu });

  const gridInfo = await resolveGridConnection({
    lat: 36.79,
    lng: 127.01,
    address,
    jibunAddress: address,
    capacityKw: 500,
    pnu,
  });

  return NextResponse.json({
    keyConfigured: debug.keyConfigured,
    parsed: debug.parsed,
    regionCodes: debug.regionCodes,
    requestParams: debug.requestParams,
    rawKepcoResponse: debug.rawResponse,
    httpStatus: debug.httpStatus,
    selectedItem: debug.selectedItem,
    mappedPoles: debug.mappedPoles,
    gridInfo: {
      dataSource: gridInfo.dataSource,
      dataSourceLabel: gridInfo.dataSourceLabel,
      statusLabel: gridInfo.statusLabel,
      substation: gridInfo.substation,
      transformer: gridInfo.transformer,
      distributionLine: gridInfo.distributionLine,
    },
  });
}
