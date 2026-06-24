import { sendConsultationEmail } from "@/lib/consultation/email";
import { solapiKakaoAdapter, solapiSmsAdapter } from "@/lib/leads/adapters/solapi";
import type { ConsultationSubmission } from "@/types/consultation";
import type { LeadRecord } from "@/types/lead";
import { sendLeadEmail, type LeadEmailResult } from "@/lib/leads/email";

export interface LeadNotifyContext {
  /** consultation route — 기존 sendConsultationEmail 흐름 유지 */
  consultationSubmission?: ConsultationSubmission;
  resultPageUrl?: string;
}

export interface LeadAdapterResult {
  ok: boolean;
  skipped?: boolean;
  error?: string;
}

export interface LeadNotifyResult {
  email: LeadEmailResult;
  adapters: Record<string, LeadAdapterResult>;
}

export type LeadNotificationAdapter = (
  lead: LeadRecord,
  context?: LeadNotifyContext,
) => Promise<LeadAdapterResult>;

async function adminDashboardAdapter(lead: LeadRecord): Promise<LeadAdapterResult> {
  console.info(
    `[Leads:Notifier:admin_dashboard] lead=${lead.id} type=${lead.leadType} phone=${lead.phone}`,
  );
  return { ok: true };
}

async function slackAdapter(_lead: LeadRecord): Promise<LeadAdapterResult> {
  if (!process.env.SLACK_WEBHOOK_URL?.trim()) {
    return { ok: true, skipped: true };
  }
  console.info("[Leads:Notifier:slack] SLACK_WEBHOOK_URL set but adapter not wired yet");
  return { ok: true, skipped: true };
}

async function solapiSmsNotifyAdapter(lead: LeadRecord): Promise<LeadAdapterResult> {
  const result = await solapiSmsAdapter(lead);
  return {
    ok: result.ok,
    skipped: result.skipped,
    error: result.error,
  };
}

async function solapiKakaoNotifyAdapter(lead: LeadRecord): Promise<LeadAdapterResult> {
  const result = await solapiKakaoAdapter(lead);
  return {
    ok: result.ok,
    skipped: result.skipped,
    error: result.error,
  };
}

const SECONDARY_ADAPTERS: Record<string, LeadNotificationAdapter> = {
  admin_dashboard: adminDashboardAdapter,
  slack: slackAdapter,
  solapi_sms: solapiSmsNotifyAdapter,
  solapi_kakao: solapiKakaoNotifyAdapter,
};

async function runEmailChannel(
  lead: LeadRecord,
  context?: LeadNotifyContext,
): Promise<LeadEmailResult> {
  if (lead.leadType === "consultation" && context?.consultationSubmission) {
    const result = await sendConsultationEmail(context.consultationSubmission, context.resultPageUrl);
    return {
      sent: result.sent,
      autoReplySent: result.autoReplySent,
      provider: result.provider,
    };
  }

  return sendLeadEmail(lead);
}

/** pdf_download · consultation은 이메일 실패 시 502, save_result는 optional */
export function isLeadEmailRequired(lead: LeadRecord): boolean {
  return lead.leadType !== "save_result";
}

/**
 * 리드 생성 시 모든 알림 채널을 호출합니다.
 * email은 필수( save_result 제외 ), 나머지 adapter는 best-effort.
 */
export async function notifyLeadCreated(
  lead: LeadRecord,
  context?: LeadNotifyContext,
): Promise<LeadNotifyResult> {
  const email = await runEmailChannel(lead, context);
  const adapters: Record<string, LeadAdapterResult> = {
    email: {
      ok: email.sent,
      error: email.sent ? undefined : "email not sent",
    },
  };

  await Promise.all(
    Object.entries(SECONDARY_ADAPTERS).map(async ([name, adapter]) => {
      try {
        adapters[name] = await adapter(lead, context);
      } catch (error) {
        adapters[name] = {
          ok: false,
          error: error instanceof Error ? error.message : "adapter failed",
        };
      }
    }),
  );

  return { email, adapters };
}
