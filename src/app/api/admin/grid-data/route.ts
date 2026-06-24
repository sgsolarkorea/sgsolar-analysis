import { NextResponse } from "next/server";
import { adminApiGuard } from "@/lib/admin/auth";
import {
  deleteGridAdminRecord,
  listGridAdminRecords,
  saveGridAdminRecord,
} from "@/lib/grid/storage";
import type { GridAdminRecord } from "@/types/gridConnection";

export async function GET() {
  const denied = await adminApiGuard();
  if (denied) return denied;

  const records = await listGridAdminRecords();
  return NextResponse.json({ records });
}

export async function POST(request: Request) {
  const denied = await adminApiGuard();
  if (denied) return denied;

  const body = (await request.json().catch(() => null)) as GridAdminRecord | null;
  if (!body?.id || !body.regionKeywords?.length) {
    return NextResponse.json({ error: "id and regionKeywords required" }, { status: 400 });
  }

  const saved = await saveGridAdminRecord(body);
  return NextResponse.json({ ok: saved });
}

export async function DELETE(request: Request) {
  const denied = await adminApiGuard();
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const ok = await deleteGridAdminRecord(id);
  return NextResponse.json({ ok });
}
