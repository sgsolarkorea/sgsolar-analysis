import { NextResponse } from "next/server";
import { checkAdminApiAccess } from "@/lib/admin/auth";
import { computeLeadAdminKpi } from "@/lib/leads/adminMetrics";
import { listAllLeads } from "@/lib/leads/storage";

export const dynamic = "force-dynamic";

export async function GET() {
  const access = await checkAdminApiAccess();
  if (!access.allowed) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    const leads = await listAllLeads();
    const kpi = computeLeadAdminKpi(leads);

    return NextResponse.json({
      leads,
      kpi,
      count: leads.length,
    });
  } catch (error) {
    console.error("[Admin Leads] List failed:", error);
    return NextResponse.json({ error: "리드 목록을 불러오지 못했습니다." }, { status: 500 });
  }
}
