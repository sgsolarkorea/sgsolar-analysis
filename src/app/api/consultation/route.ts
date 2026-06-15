import { NextResponse } from "next/server";
import { sendConsultationEmail } from "@/lib/consultation/email";
import { saveConsultation } from "@/lib/consultation/storage";
import { validateConsultationBody } from "@/lib/consultation/validate";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validated = validateConsultationBody(body);

    if (!validated.ok) {
      return NextResponse.json({ error: validated.error }, { status: 400 });
    }

    const saved = await saveConsultation(validated.data);

    try {
      await sendConsultationEmail(saved, validated.data.resultPageUrl);
    } catch (emailError) {
      console.error("[Consultation] Email notification failed:", emailError);
    }

    return NextResponse.json({
      ok: true,
      id: saved.id,
      submittedAt: saved.submittedAt,
    });
  } catch (error) {
    console.error("[Consultation] Save failed:", error);
    return NextResponse.json(
      { error: "상담 신청 저장 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 500 },
    );
  }
}
