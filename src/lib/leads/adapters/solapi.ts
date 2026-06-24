import { createHmac, randomBytes } from "crypto";
import type { LeadRecord } from "@/types/lead";
import { LEAD_TYPE_LABELS, leadTypeToScore } from "@/types/lead";

const SOLAPI_API_BASE = "https://api.solapi.com";
const SMS_MAX_LENGTH = 900;
const ADMIN_LEADS_URL = "https://sgsolar-analysis.vercel.app/admin/leads";

export interface SolapiConfig {
  enabled: boolean;
  apiKey: string;
  apiSecret: string;
  sender: string;
  adminPhone: string;
  kakaoPfId?: string;
  kakaoTemplateId?: string;
}

export interface SolapiSendResult {
  ok: boolean;
  skipped?: boolean;
  error?: string;
  messageId?: string;
}

export function isSolapiEnabled(): boolean {
  const raw = process.env.SOLAPI_ENABLED?.trim().toLowerCase();
  return raw === "true" || raw === "1" || raw === "yes";
}

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

export function getSolapiConfig(): SolapiConfig | null {
  if (!isSolapiEnabled()) return null;

  const apiKey = process.env.SOLAPI_API_KEY?.trim() ?? "";
  const apiSecret = process.env.SOLAPI_API_SECRET?.trim() ?? "";
  const sender = process.env.SOLAPI_SENDER?.trim() ?? "";
  const adminPhone = process.env.SOLAPI_ADMIN_PHONE?.trim() ?? "";

  if (!apiKey || !apiSecret || !sender || !adminPhone) {
    return null;
  }

  return {
    enabled: true,
    apiKey,
    apiSecret,
    sender: normalizePhone(sender),
    adminPhone: normalizePhone(adminPhone),
    kakaoPfId: process.env.SOLAPI_KAKAO_PFID?.trim() || undefined,
    kakaoTemplateId: process.env.SOLAPI_KAKAO_TEMPLATE_ID?.trim() || undefined,
  };
}

export function buildSolapiAuthHeader(apiKey: string, apiSecret: string): string {
  const date = new Date().toISOString();
  const salt = randomBytes(16).toString("hex");
  const signature = createHmac("sha256", apiSecret).update(date + salt).digest("hex");
  return `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${signature}`;
}

function displayName(lead: LeadRecord): string {
  return lead.name?.trim() || "미입력";
}

function formatCapacity(lead: LeadRecord): string {
  if (lead.estimatedCapacityKw != null && Number.isFinite(lead.estimatedCapacityKw)) {
    return `${lead.estimatedCapacityKw}kW`;
  }
  const fromContext = lead.analysisContext?.capacity?.trim();
  return fromContext || "미입력";
}

function truncateSms(text: string, maxLength = SMS_MAX_LENGTH): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1)}…`;
}

export function buildLeadSmsText(lead: LeadRecord): string {
  const score = leadTypeToScore(lead.leadType);
  const typeLabel = LEAD_TYPE_LABELS[lead.leadType];

  const lines = [
    "[SG SOLAR 신규 리드]",
    "",
    `유형: ${score} (${typeLabel})`,
    `이름: ${displayName(lead)}`,
    `연락처: ${lead.phone}`,
    `주소: ${lead.address}`,
    `용량: ${formatCapacity(lead)}`,
    "",
    "관리자 페이지:",
    ADMIN_LEADS_URL,
  ];

  return truncateSms(lines.join("\n"));
}

export function buildLeadKakaoVariables(lead: LeadRecord): Record<string, string> {
  const score = leadTypeToScore(lead.leadType);
  const typeLabel = LEAD_TYPE_LABELS[lead.leadType];

  return {
    "#{유형}": score,
    "#{leadType}": typeLabel,
    "#{이름}": displayName(lead),
    "#{name}": displayName(lead),
    "#{연락처}": lead.phone,
    "#{phone}": lead.phone,
    "#{주소}": lead.address,
    "#{address}": lead.address,
    "#{용량}": formatCapacity(lead),
    "#{capacity}": formatCapacity(lead),
    "#{adminUrl}": ADMIN_LEADS_URL,
  };
}

interface SolapiMessageResponse {
  groupId?: string;
  messageId?: string;
  errorCode?: string;
  errorMessage?: string;
  message?: string;
}

async function postSolapiMessage(
  config: SolapiConfig,
  payload: Record<string, unknown>,
): Promise<SolapiSendResult> {
  try {
    const response = await fetch(`${SOLAPI_API_BASE}/messages/v4/send`, {
      method: "POST",
      headers: {
        Authorization: buildSolapiAuthHeader(config.apiKey, config.apiSecret),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = (await response.json().catch(() => ({}))) as SolapiMessageResponse;

    if (!response.ok) {
      const error =
        data.errorMessage ?? data.message ?? `Solapi HTTP ${response.status}`;
      return { ok: false, error };
    }

    return { ok: true, messageId: data.messageId ?? data.groupId };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Solapi request failed",
    };
  }
}

function solapiDisabledResult(): SolapiSendResult {
  return { ok: true, skipped: true };
}

function solapiMisconfiguredResult(): SolapiSendResult {
  return {
    ok: false,
    error:
      "SOLAPI_ENABLED=true but SOLAPI_API_KEY, SOLAPI_API_SECRET, SOLAPI_SENDER, or SOLAPI_ADMIN_PHONE is missing",
  };
}

export async function sendLeadSmsNotification(lead: LeadRecord): Promise<SolapiSendResult> {
  if (!isSolapiEnabled()) return solapiDisabledResult();

  const config = getSolapiConfig();
  if (!config) return solapiMisconfiguredResult();

  const text = buildLeadSmsText(lead);

  return postSolapiMessage(config, {
    message: {
      to: config.adminPhone,
      from: config.sender,
      text,
      type: text.length > 90 ? "LMS" : "SMS",
    },
  });
}

export async function sendLeadKakaoNotification(lead: LeadRecord): Promise<SolapiSendResult> {
  if (!isSolapiEnabled()) return solapiDisabledResult();

  const config = getSolapiConfig();
  if (!config) return solapiMisconfiguredResult();

  if (!config.kakaoPfId || !config.kakaoTemplateId) {
    return { ok: true, skipped: true, error: "SOLAPI_KAKAO_PFID or SOLAPI_KAKAO_TEMPLATE_ID not set" };
  }

  return postSolapiMessage(config, {
    message: {
      to: config.adminPhone,
      from: config.sender,
      type: "ATA",
      kakaoOptions: {
        pfId: config.kakaoPfId,
        templateId: config.kakaoTemplateId,
        variables: buildLeadKakaoVariables(lead),
      },
    },
  });
}

export async function solapiSmsAdapter(lead: LeadRecord): Promise<SolapiSendResult> {
  const result = await sendLeadSmsNotification(lead);
  if (result.ok && !result.skipped) {
    console.info(`[Leads:Notifier:solapi_sms] sent lead=${lead.id}`);
  }
  return result;
}

export async function solapiKakaoAdapter(lead: LeadRecord): Promise<SolapiSendResult> {
  const result = await sendLeadKakaoNotification(lead);
  if (result.ok && !result.skipped) {
    console.info(`[Leads:Notifier:solapi_kakao] sent lead=${lead.id}`);
  }
  return result;
}
