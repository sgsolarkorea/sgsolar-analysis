import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin/auth";
import { approveOrdinanceRecord } from "@/lib/ordinanceLearning/queue";

interface RouteContext {
  params: Promise<{ slug: string }>;
}

export async function POST(_request: Request, context: RouteContext) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await context.params;
  const record = await approveOrdinanceRecord(slug);
  if (!record) {
    return NextResponse.json({ error: "Not found or not approvable" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, record });
}
