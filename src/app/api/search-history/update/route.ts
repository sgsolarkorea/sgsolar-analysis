import { NextResponse } from "next/server";
import { updateSearchHistoryParcels } from "@/lib/searchHistory/storage";
import type { ParcelSnapshot } from "@/types/parcelReview";

export async function PATCH(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    id?: string;
    parcels?: ParcelSnapshot[];
    parcelCount?: number;
    totalLandArea?: string;
    capacity?: string;
    moduleCount?: string;
    annualGeneration?: string;
    annualRevenue?: string;
  } | null;

  if (!body?.id || !body.parcels) {
    return NextResponse.json({ error: "id and parcels required" }, { status: 400 });
  }

  const saved = await updateSearchHistoryParcels({
    id: body.id,
    parcels: body.parcels,
    parcelCount: body.parcelCount ?? body.parcels.length,
    totalLandArea: body.totalLandArea ?? "",
    capacity: body.capacity ?? "",
    moduleCount: body.moduleCount ?? "",
    annualGeneration: body.annualGeneration ?? "",
    annualRevenue: body.annualRevenue ?? "",
  });

  return NextResponse.json({ ok: saved });
}
