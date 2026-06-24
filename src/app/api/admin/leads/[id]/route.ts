import { NextResponse } from "next/server";
import { adminApiGuard } from "@/lib/admin/auth";
import { parseLeadAdminPatch } from "@/lib/leads/adminPatch";
import { deleteLead, updateLead } from "@/lib/leads/storage";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

function parseLeadId(id: string | undefined): string | null {
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return null;
  return id;
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const denied = await adminApiGuard();
    if (denied) return denied;

    const { id } = await context.params;
    const parsedId = parseLeadId(id);
    if (!parsedId) {
      return NextResponse.json({ error: "리드 ID 형식이 올바르지 않습니다." }, { status: 400 });
    }

    const body = await request.json();
    const patch = parseLeadAdminPatch(body);
    if (!patch) {
      return NextResponse.json({ error: "변경할 필드가 없거나 값 형식이 올바르지 않습니다." }, { status: 400 });
    }

    const result = await updateLead(parsedId, patch);
    if (!result.updated || !result.lead) {
      return NextResponse.json({ error: "리드를 찾을 수 없거나 저장에 실패했습니다." }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      lead: result.lead,
      storage: result.storage,
    });
  } catch (error) {
    console.error("[Admin Leads] Update failed:", error);
    return NextResponse.json({ error: "리드 업데이트 중 오류가 발생했습니다." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const denied = await adminApiGuard();
    if (denied) return denied;

    const { id: rawId } = await context.params;
    const id = parseLeadId(rawId);
    if (!id) {
      return NextResponse.json({ error: "리드 ID 형식이 올바르지 않습니다." }, { status: 400 });
    }

    const result = await deleteLead(id);
    if (!result.deleted) {
      return NextResponse.json({ error: "리드를 찾을 수 없거나 삭제에 실패했습니다." }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      id,
      storage: result.storage,
    });
  } catch (error) {
    console.error("[Admin Leads] Delete failed:", error);
    return NextResponse.json({ error: "리드 삭제 중 오류가 발생했습니다." }, { status: 500 });
  }
}
