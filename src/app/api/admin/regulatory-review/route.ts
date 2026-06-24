import { NextResponse } from "next/server";
import { adminApiGuard } from "@/lib/admin/auth";
import { buildRegulatoryReviewAdminData } from "@/lib/regulatory/buildRegulatoryReviewAdminData";

export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await adminApiGuard();
  if (denied) return denied;

  const payload = buildRegulatoryReviewAdminData();
  return NextResponse.json(payload);
}
