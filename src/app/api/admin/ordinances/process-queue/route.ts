import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin/auth";
import { processOrdinanceQueue } from "@/lib/ordinanceLearning/queue";

export async function POST() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const processed = await processOrdinanceQueue(5);
  return NextResponse.json({ ok: true, processed });
}
