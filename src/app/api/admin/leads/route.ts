import { NextResponse } from "next/server";
import { adminApiGuard } from "@/lib/admin/auth";
import { computeLeadAdminStats } from "@/lib/leads/adminMetrics";
import { listAllLeads } from "@/lib/leads/storage";

export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await adminApiGuard();
  if (denied) return denied;

  try {
    const leads = await listAllLeads();
    const stats = computeLeadAdminStats(leads);

    return NextResponse.json({
      leads,
      kpi: stats.kpi,
      stats,
      count: leads.length,
    });
  } catch (error) {
    console.error("[Admin Leads] List failed:", error);
    return NextResponse.json({ error: "리드 목록을 불러오지 못했습니다." }, { status: 500 });
  }
}
