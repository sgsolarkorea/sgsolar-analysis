import { NextResponse } from "next/server";
import { adminApiGuard } from "@/lib/admin/auth";
import { listOrdinanceAdminRows } from "@/lib/ordinanceLearning/registry";
import { buildSearchDashboardStats } from "@/lib/ordinanceLearning/stats";
import { getOrdinanceRecord } from "@/lib/ordinanceLearning/storage";

export async function GET() {
  const denied = await adminApiGuard();
  if (denied) return denied;

  const [rows, stats] = await Promise.all([listOrdinanceAdminRows(), buildSearchDashboardStats()]);

  return NextResponse.json({ rows, stats });
}

export async function POST(request: Request) {
  const denied = await adminApiGuard();
  if (denied) return denied;

  const body = (await request.json().catch(() => null)) as { slug?: string } | null;
  if (!body?.slug) {
    return NextResponse.json({ error: "slug required" }, { status: 400 });
  }

  const record = await getOrdinanceRecord(body.slug);
  if (!record) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ record });
}
