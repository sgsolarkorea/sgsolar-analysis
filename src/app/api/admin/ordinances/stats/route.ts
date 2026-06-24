import { NextResponse } from "next/server";
import { adminApiGuard } from "@/lib/admin/auth";
import { buildSearchDashboardStats } from "@/lib/ordinanceLearning/stats";

export async function GET() {
  const denied = await adminApiGuard();
  if (denied) return denied;

  const stats = await buildSearchDashboardStats();
  return NextResponse.json(stats);
}
