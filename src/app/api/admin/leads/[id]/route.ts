import { NextResponse } from "next/server";
import { LEAD_STATUSES } from "@/lib/leads/adminMetrics";
import { deleteLead, updateLeadStatus } from "@/lib/leads/storage";
import type { LeadStatus } from "@/types/lead";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

function parseStatus(body: unknown): LeadStatus | null {
  if (!body || typeof body !== "object") return null;
  const raw = (body as Record<string, unknown>).status;
  if (typeof raw !== "string") return null;
  const status = raw.trim() as LeadStatus;
  return LEAD_STATUSES.includes(status) ? status : null;
}

function parseLeadId(id: string | undefined): string | null {
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return null;
  return id;
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const parsedId = parseLeadId(id);
    if (!parsedId) {
      return NextResponse.json({ error: "리드 ID 형식이 올바르지 않습니다." }, { status: 400 });
    }

    const body = await request.json();
    const status = parseStatus(body);
    if (!status) {
      return NextResponse.json({ error: "상태 값이 올바르지 않습니다." }, { status: 400 });
    }

    const result = await updateLeadStatus(parsedId, status);
    if (!result.updated || !result.lead) {
      return NextResponse.json({ error: "리드를 찾을 수 없거나 저장에 실패했습니다." }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      lead: result.lead,
      storage: result.storage,
    });
  } catch (error) {
    console.error("[Admin Leads] Status update failed:", error);
    return NextResponse.json({ error: "상태 변경 중 오류가 발생했습니다." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
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
