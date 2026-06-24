import { Resend } from "resend";
import nodemailer from "nodemailer";
import type { LeadRecord } from "@/types/lead";
import { LEAD_TYPE_LABELS } from "@/types/lead";
import {
  buildCustomerAutoReply,
  getConsultationReceiverEmail,
  getResendFromEmail,
} from "@/lib/consultation/emailContent";
import type { ConsultationSubmission } from "@/types/consultation";

export interface LeadEmailResult {
  sent: boolean;
  autoReplySent?: boolean;
  provider?: "resend" | "smtp" | "none";
}

function formatSubmittedAtKst(iso: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

function displayValue(value: string | undefined, fallback = "(미입력)"): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}

function buildLeadStaffContent(lead: LeadRecord): { subject: string; text: string; html: string } {
  const typeLabel = LEAD_TYPE_LABELS[lead.leadType];
  const rows = [
    { label: "리드 유형", value: typeLabel },
    { label: "source", value: lead.source },
    { label: "접수일시", value: formatSubmittedAtKst(lead.createdAt) },
    { label: "이름", value: displayValue(lead.name) },
    { label: "연락처", value: lead.phone },
    { label: "이메일", value: displayValue(lead.email) },
    { label: "주소", value: lead.address },
    { label: "설치유형", value: displayValue(lead.installType) },
    {
      label: "예상 용량(kW)",
      value:
        lead.estimatedCapacityKw != null && Number.isFinite(lead.estimatedCapacityKw)
          ? String(lead.estimatedCapacityKw)
          : displayValue(lead.analysisContext?.capacity, "별도 확인"),
    },
    { label: "문의내용", value: lead.message || "(없음)" },
    { label: "결과 URL", value: lead.resultUrl || "(미제공)" },
    { label: "PDF URL", value: lead.pdfUrl || "(미제공)" },
    { label: "리드 ID", value: lead.id },
  ];

  const text = [`[SG SOLAR] 새 리드 — ${typeLabel}`, "", ...rows.map((r) => `${r.label}: ${r.value}`)].join(
    "\n",
  );

  const htmlRows = rows
    .map((row) => {
      const value =
        (row.label === "결과 URL" || row.label === "PDF URL") && row.value.startsWith("http")
          ? `<a href="${row.value}">${row.value}</a>`
          : row.label === "문의내용"
            ? row.value.replace(/\n/g, "<br>")
            : row.value;
      return `<tr><td><strong>${row.label}</strong></td><td>${value}</td></tr>`;
    })
    .join("");

  const html = `
    <h2>SG SOLAR 새 리드 — ${typeLabel}</h2>
    <table cellpadding="6" cellspacing="0" style="border-collapse:collapse;font-family:sans-serif;font-size:14px;">
      ${htmlRows}
    </table>
  `.trim();

  return {
    subject: `[SG SOLAR] ${typeLabel} — ${lead.name ?? lead.phone} (${lead.address})`,
    text,
    html,
  };
}

function getSmtpConfig() {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  const port = Number(process.env.SMTP_PORT ?? "587");
  if (!host || !user || !pass) return null;
  return { host, user, pass, port };
}

async function sendViaResend(lead: LeadRecord): Promise<LeadEmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) throw new Error("RESEND_API_KEY not configured");

  const resend = new Resend(apiKey);
  const from = getResendFromEmail();
  const receiver = getConsultationReceiverEmail();
  const staff = buildLeadStaffContent(lead);

  const { error } = await resend.emails.send({
    from,
    to: [receiver],
    subject: staff.subject,
    text: staff.text,
    html: staff.html,
  });

  if (error) throw new Error(error.message || "Resend send failed");

  let autoReplySent = false;
  if (lead.leadType === "consultation" && lead.email && lead.name) {
    const submission: ConsultationSubmission = {
      id: lead.id,
      submittedAt: lead.createdAt,
      name: lead.name,
      phone: lead.phone,
      email: lead.email,
      address: lead.address,
      installType: lead.installType ?? "",
      message: lead.message ?? "",
      resultPageUrl: lead.resultUrl,
      analysisContext: lead.analysisContext,
    };
    const autoReply = buildCustomerAutoReply(submission);
    const { error: autoError } = await resend.emails.send({
      from,
      to: [lead.email],
      subject: autoReply.subject,
      text: autoReply.text,
      html: autoReply.html,
    });
    autoReplySent = !autoError;
  }

  return { sent: true, autoReplySent, provider: "resend" };
}

async function sendViaSmtp(lead: LeadRecord): Promise<LeadEmailResult> {
  const config = getSmtpConfig();
  if (!config) throw new Error("SMTP not configured");

  const receiver = getConsultationReceiverEmail();
  const staff = buildLeadStaffContent(lead);

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    requireTLS: config.port === 587,
    auth: { user: config.user, pass: config.pass },
    connectionTimeout: 15_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
    tls: { minVersion: "TLSv1.2" },
  });

  await transporter.sendMail({
    from: `"SG SOLAR" <${config.user}>`,
    to: receiver,
    subject: staff.subject,
    text: staff.text,
    html: staff.html,
  });

  let autoReplySent = false;
  if (lead.leadType === "consultation" && lead.email && lead.name) {
    const submission: ConsultationSubmission = {
      id: lead.id,
      submittedAt: lead.createdAt,
      name: lead.name,
      phone: lead.phone,
      email: lead.email,
      address: lead.address,
      installType: lead.installType ?? "",
      message: lead.message ?? "",
      resultPageUrl: lead.resultUrl,
      analysisContext: lead.analysisContext,
    };
    const autoReply = buildCustomerAutoReply(submission);
    await transporter.sendMail({
      from: `"SG SOLAR" <${config.user}>`,
      to: lead.email,
      subject: autoReply.subject,
      text: autoReply.text,
      html: autoReply.html,
    });
    autoReplySent = true;
  }

  return { sent: true, autoReplySent, provider: "smtp" };
}

export async function sendLeadEmail(lead: LeadRecord): Promise<LeadEmailResult> {
  if (lead.leadType === "save_result") {
    try {
      if (process.env.RESEND_API_KEY?.trim()) {
        return await sendViaResend(lead);
      }
      return await sendViaSmtp(lead);
    } catch (error) {
      console.warn("[Leads] save_result email optional failure:", error);
      return { sent: false, provider: "none" };
    }
  }

  const resendKey = process.env.RESEND_API_KEY?.trim();
  if (resendKey) {
    try {
      return await sendViaResend(lead);
    } catch (error) {
      console.warn("[Leads] Resend failed, trying SMTP:", error);
    }
  }

  try {
    return await sendViaSmtp(lead);
  } catch (error) {
    console.error("[Leads] Email delivery failed:", error);
    throw new Error("이메일 발송에 실패했습니다. 잠시 후 다시 시도해 주세요.");
  }
}
