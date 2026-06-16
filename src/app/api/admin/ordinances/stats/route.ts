import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin/auth";
import { buildSearchDashboardStats } from "@/lib/ordinanceLearning/stats";

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const stats = await buildSearchDashboardStats();
  return NextResponse.json(stats);
}
