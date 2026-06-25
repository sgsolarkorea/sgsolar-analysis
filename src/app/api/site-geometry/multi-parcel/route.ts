import { NextResponse } from "next/server";
import { resolveMultiParcelSiteGeometry, type ParcelRef } from "@/lib/solar/resolveMultiParcelGeometry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function parseParcels(value: unknown): ParcelRef[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      const pnu = typeof record.pnu === "string" ? record.pnu.trim() : "";
      const lat = Number(record.lat);
      const lng = Number(record.lng);
      if (!pnu || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      return { pnu, lat, lng };
    })
    .filter((item): item is ParcelRef => item != null);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      parcels?: unknown;
      capacityKw?: number;
      registryLandAreaSqm?: number;
    };
    const parcels = parseParcels(body.parcels);
    if (parcels.length < 2) {
      return NextResponse.json({ error: "parcels 2개 이상 필요합니다." }, { status: 400 });
    }

    const capacityKw = Number(body.capacityKw);
    const registryLandAreaSqm = Number(body.registryLandAreaSqm);

    const geometry = await resolveMultiParcelSiteGeometry({
      parcels,
      capacityKw: Number.isFinite(capacityKw) && capacityKw > 0 ? capacityKw : 1,
      registryLandAreaSqm:
        Number.isFinite(registryLandAreaSqm) && registryLandAreaSqm > 0
          ? registryLandAreaSqm
          : undefined,
    });

    return NextResponse.json({ geometry });
  } catch (error) {
    console.error("[site-geometry/multi-parcel] failed:", error);
    return NextResponse.json({ error: "다중 필지 geometry 조회에 실패했습니다." }, { status: 500 });
  }
}
