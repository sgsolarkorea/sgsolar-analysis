import { NextResponse } from "next/server";
import { parseBulkUuidIds } from "@/lib/admin/parseBulkIds";
import { adminApiGuard } from "@/lib/admin/auth";
import { deleteSearchHistoryEntry } from "@/lib/searchHistory/storage";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const denied = await adminApiGuard();
    if (denied) return denied;

    const body = await request.json();
    const ids = parseBulkUuidIds(body);
    if (!ids) {
      return NextResponse.json({ error: "삭제할 조회 이력 ID 목록이 올바르지 않습니다." }, { status: 400 });
    }

    const failed: string[] = [];
    let deleted = 0;

    for (const id of ids) {
      const result = await deleteSearchHistoryEntry(id);
      if (result.deleted) {
        deleted += 1;
      } else {
        failed.push(id);
      }
    }

    return NextResponse.json({
      ok: true,
      deleted,
      failed,
    });
  } catch (error) {
    console.error("[Admin SearchHistory] Bulk delete failed:", error);
    return NextResponse.json({ error: "조회 이력 일괄 삭제 중 오류가 발생했습니다." }, { status: 500 });
  }
}
