import { NextResponse } from "next/server";
import { buildRegulatoryReviewAdminData } from "@/lib/regulatory/buildRegulatoryReviewAdminData";

export const dynamic = "force-dynamic";

export async function GET() {
  const payload = buildRegulatoryReviewAdminData();
  return NextResponse.json(payload);
}
