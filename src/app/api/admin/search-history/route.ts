import { NextResponse } from "next/server";
import { adminApiGuard } from "@/lib/admin/auth";
import { listSearchHistory } from "@/lib/searchHistory/storage";

export async function GET() {
  const denied = await adminApiGuard();
  if (denied) return denied;

  const entries = await listSearchHistory();
  return NextResponse.json({ entries });
}
