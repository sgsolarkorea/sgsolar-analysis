import { NextResponse } from "next/server";
import { checkAdminApiAccess } from "@/lib/admin/auth";
import { buildRegulatoryReviewAdminData } from "@/lib/regulatory/buildRegulatoryReviewAdminData";

export const dynamic = "force-dynamic";

export async function GET() {
  const access = await checkAdminApiAccess();
  if (!access.allowed) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const payload = buildRegulatoryReviewAdminData();
  return NextResponse.json(payload);
}
