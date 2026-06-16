import { NextResponse } from "next/server";
import { findAdjacentParcels } from "@/lib/api/adjacentParcels";
import { ADJACENT_PARCEL_MVP_LIMIT } from "@/lib/parcels/constants";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));
  const excludePnu = searchParams.get("excludePnu")?.trim() ?? undefined;
  const existingRaw = searchParams.get("existingPnus")?.trim();
  const existingPnus = existingRaw ? existingRaw.split(",").filter(Boolean) : [];

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "lat and lng required" }, { status: 400 });
  }

  const candidates = await findAdjacentParcels({
    lat,
    lng,
    excludePnu,
    existingPnus,
    radiusM: 50,
    maxCandidates: ADJACENT_PARCEL_MVP_LIMIT,
  });

  return NextResponse.json({
    candidates,
    radiusM: 50,
    maxCandidates: ADJACENT_PARCEL_MVP_LIMIT,
  });
}
