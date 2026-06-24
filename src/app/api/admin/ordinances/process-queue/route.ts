import { NextResponse } from "next/server";
import { adminApiGuard } from "@/lib/admin/auth";
import { processOrdinanceQueue } from "@/lib/ordinanceLearning/queue";

export async function POST() {
  const denied = await adminApiGuard();
  if (denied) return denied;

  const processed = await processOrdinanceQueue(5);
  return NextResponse.json({ ok: true, processed });
}
