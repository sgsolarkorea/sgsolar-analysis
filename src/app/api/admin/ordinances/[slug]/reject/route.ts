import { NextResponse } from "next/server";
import { adminApiGuard } from "@/lib/admin/auth";
import { rejectOrdinanceRecord } from "@/lib/ordinanceLearning/queue";

interface RouteContext {
  params: Promise<{ slug: string }>;
}

export async function POST(_request: Request, context: RouteContext) {
  const denied = await adminApiGuard();
  if (denied) return denied;

  const { slug } = await context.params;
  const record = await rejectOrdinanceRecord(slug);
  if (!record) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, record });
}
