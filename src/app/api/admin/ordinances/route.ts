import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin/auth";
import { listOrdinanceAdminRows } from "@/lib/ordinanceLearning/registry";
import { buildSearchDashboardStats } from "@/lib/ordinanceLearning/stats";
import { getOrdinanceRecord } from "@/lib/ordinanceLearning/storage";

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [rows, stats] = await Promise.all([listOrdinanceAdminRows(), buildSearchDashboardStats()]);

  return NextResponse.json({ rows, stats });
}

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
