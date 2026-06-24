import { NextResponse } from "next/server";
import { isLeadEmailRequired, notifyLeadCreated } from "@/lib/leads/notifier";
import { createLeadRecord, saveLead } from "@/lib/leads/storage";
import { validateLeadBody } from "@/lib/leads/validate";
import { linkSearchHistoryToConsultation } from "@/lib/searchHistory/storage";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validated = validateLeadBody(body);

    if (!validated.ok) {
      return NextResponse.json({ error: validated.error }, { status: 400 });
    }

    const lead = createLeadRecord(validated.data);
    const storage = await saveLead(lead);

    if (!storage.saved) {
      return NextResponse.json(
        { error: "리드 저장에 실패했습니다. 잠시 후 다시 시도해 주세요." },
        { status: 503 },
      );
    }

    let notifyResult;
    try {
      notifyResult = await notifyLeadCreated(lead);
    } catch (error) {
      console.error("[Leads] Notification failed after save:", error);
      if (isLeadEmailRequired(lead)) {
        return NextResponse.json(
          {
            error:
              error instanceof Error
                ? error.message
                : "리드는 저장되었으나 이메일 발송에 실패했습니다.",
            id: lead.id,
            saved: true,
          },
          { status: 502 },
        );
      }
      notifyResult = { email: { sent: false, provider: "none" as const }, adapters: {} };
    }

    const emailResult = notifyResult.email;

    let searchHistoryLinked = false;
    if (validated.data.leadType === "consultation" && validated.data.searchHistoryId) {
      searchHistoryLinked = await linkSearchHistoryToConsultation({
        searchHistoryId: validated.data.searchHistoryId,
        consultationId: lead.id,
        address: lead.address,
      });
    }

    return NextResponse.json({
      ok: true,
      id: lead.id,
      createdAt: lead.createdAt,
      leadType: lead.leadType,
      status: lead.status,
      source: lead.source,
      emailSent: emailResult.sent,
      autoReplySent: emailResult.autoReplySent ?? false,
      emailProvider: emailResult.provider,
      storage: storage.storage,
      searchHistoryLinked,
    });
  } catch (error) {
    console.error("[Leads] Submission failed:", error);
    const message =
      error instanceof Error ? error.message : "리드 접수 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
