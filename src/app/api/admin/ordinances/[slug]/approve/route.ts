import { NextResponse } from "next/server";
import { adminApiGuard } from "@/lib/admin/auth";
import { approveOrdinanceRecord } from "@/lib/ordinanceLearning/queue";

interface RouteContext {
  params: Promise<{ slug: string }>;
}

export async function POST(_request: Request, context: RouteContext) {
  const denied = await adminApiGuard();
  if (denied) return denied;

  const { slug } = await context.params;
  const record = await approveOrdinanceRecord(slug);
  if (!record) {
    return NextResponse.json({ error: "Not found or not approvable" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, record });
}
