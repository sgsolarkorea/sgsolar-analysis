import { NextResponse } from "next/server";
import { resolveGridConnection } from "@/lib/grid/resolve";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    lat?: number;
    lng?: number;
    address?: string;
    jibunAddress?: string;
    capacityKw?: number;
    poleId?: string;
  } | null;

  if (body?.lat == null || body?.lng == null || !body.address) {
    return NextResponse.json({ error: "lat, lng, address required" }, { status: 400 });
  }

  const gridInfo = await resolveGridConnection({
    lat: body.lat,
    lng: body.lng,
    address: body.address,
    jibunAddress: body.jibunAddress ?? body.address,
    capacityKw: body.capacityKw ?? 0,
    poleId: body.poleId,
  });

  return NextResponse.json({ gridInfo });
}
