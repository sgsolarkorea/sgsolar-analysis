import { NextResponse } from "next/server";
import { sendConsultationEmail } from "@/lib/consultation/email";
import {
  createConsultationSubmission,
  trySaveConsultation,
} from "@/lib/consultation/storage";
import { validateConsultationBody } from "@/lib/consultation/validate";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validated = validateConsultationBody(body);

    if (!validated.ok) {
      return NextResponse.json({ error: validated.error }, { status: 400 });
    }

    const submission = createConsultationSubmission(validated.data);

    const storage = await trySaveConsultation(submission);
    if (!storage.saved) {
      console.warn("[Consultation] JSON storage skipped or failed — continuing with email");
    }

    const emailResult = await sendConsultationEmail(submission, validated.data.resultPageUrl);

    return NextResponse.json({
      ok: true,
      id: submission.id,
      submittedAt: submission.submittedAt,
      emailSent: emailResult.sent,
      autoReplySent: emailResult.autoReplySent,
      emailProvider: emailResult.provider,
      jsonSaved: storage.saved,
    });
  } catch (error) {
    console.error("[Consultation] Submission failed:", error);
    const message =
      error instanceof Error ? error.message : "상담 신청 접수 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
