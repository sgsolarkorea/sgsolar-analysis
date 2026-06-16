import nodemailer from "nodemailer";
import { Resend } from "resend";
import {
  buildCustomerAutoReply,
  buildStaffEmailContent,
  getConsultationReceiverEmail,
  getResendFromEmail,
} from "@/lib/consultation/emailContent";
import type { ConsultationSubmission } from "@/types/consultation";

export type ConsultationEmailProvider = "resend" | "smtp";

export interface ConsultationEmailResult {
  sent: boolean;
  autoReplySent: boolean;
  provider: ConsultationEmailProvider;
  staffMessageId?: string;
  autoReplyMessageId?: string;
}

interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
}

function getSmtpConfig(): SmtpConfig | null {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  const portRaw = process.env.SMTP_PORT?.trim();

  if (!host || !user || !pass) return null;

  const port = portRaw ? Number(portRaw) : 587;
  if (!Number.isFinite(port) || port <= 0) return null;

  return { host, port, user, pass };
}

function isValidCustomerEmail(email: string | undefined): email is string {
  const trimmed = email?.trim();
  return Boolean(trimmed && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed));
}

async function sendAutoReplyViaResend(
  resend: Resend,
  submission: ConsultationSubmission,
  from: string,
): Promise<{ sent: boolean; messageId?: string }> {
  if (!isValidCustomerEmail(submission.email)) {
    return { sent: false };
  }

  const autoReply = buildCustomerAutoReply(submission);
  const { data, error } = await resend.emails.send({
    from,
    to: [submission.email],
    subject: autoReply.subject,
    text: autoReply.text,
    html: autoReply.html,
  });

  if (error) {
    console.warn("[Consultation] Resend auto-reply failed (staff email sent):", error);
    return { sent: false };
  }

  console.info(
    `[Consultation] Auto-reply sent via Resend to ${submission.email}, id=${data?.id ?? "unknown"}`,
  );
  return { sent: true, messageId: data?.id };
}

async function sendViaResend(
  submission: ConsultationSubmission,
  resultPageUrl?: string,
): Promise<ConsultationEmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("RESEND_API_KEY not configured");
  }

  const resend = new Resend(apiKey);
  const from = getResendFromEmail();
  const receiver = getConsultationReceiverEmail();
  const staff = buildStaffEmailContent(submission, resultPageUrl);

  const { data, error } = await resend.emails.send({
    from,
    to: [receiver],
    subject: staff.subject,
    text: staff.text,
    html: staff.html,
  });

  if (error) {
    console.warn("[Consultation] Resend staff notification failed:", error);
    throw new Error(error.message || "Resend send failed");
  }

  console.info(
    `[Consultation] Staff notification sent via Resend to ${receiver}, id=${data?.id ?? "unknown"}`,
  );

  const autoReply = await sendAutoReplyViaResend(resend, submission, from);

  return {
    sent: true,
    autoReplySent: autoReply.sent,
    provider: "resend",
    staffMessageId: data?.id,
    autoReplyMessageId: autoReply.messageId,
  };
}

async function sendAutoReplyViaSmtp(
  transporter: nodemailer.Transporter,
  config: SmtpConfig,
  submission: ConsultationSubmission,
): Promise<boolean> {
  if (!isValidCustomerEmail(submission.email)) return false;

  try {
    const autoReply = buildCustomerAutoReply(submission);
    await transporter.sendMail({
      from: `"SG SOLAR" <${config.user}>`,
      to: submission.email,
      subject: autoReply.subject,
      text: autoReply.text,
      html: autoReply.html,
    });
    console.info(`[Consultation] Auto-reply sent via SMTP to ${submission.email}`);
    return true;
  } catch (error) {
    console.warn("[Consultation] SMTP auto-reply failed (staff email sent):", error);
    return false;
  }
}

async function sendViaSmtp(
  submission: ConsultationSubmission,
  resultPageUrl?: string,
): Promise<ConsultationEmailResult> {
  const config = getSmtpConfig();
  if (!config) {
    throw new Error("SMTP not configured");
  }

  const receiver = getConsultationReceiverEmail();
  const staff = buildStaffEmailContent(submission, resultPageUrl);

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    requireTLS: config.port === 587,
    auth: {
      user: config.user,
      pass: config.pass,
    },
    connectionTimeout: 15_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
    tls: { minVersion: "TLSv1.2" },
  });

  await transporter.sendMail({
    from: `"SG SOLAR 상담신청" <${config.user}>`,
    to: receiver,
    subject: staff.subject,
    text: staff.text,
    html: staff.html,
  });

  console.info(`[Consultation] Staff notification sent via SMTP to ${receiver}`);

  const autoReplySent = await sendAutoReplyViaSmtp(transporter, config, submission);

  return {
    sent: true,
    autoReplySent,
    provider: "smtp",
  };
}

export async function sendConsultationEmail(
  submission: ConsultationSubmission,
  resultPageUrl?: string,
): Promise<ConsultationEmailResult> {
  const resendKey = process.env.RESEND_API_KEY?.trim();

  if (resendKey) {
    try {
      return await sendViaResend(submission, resultPageUrl);
    } catch (error) {
      console.warn("[Consultation] Resend delivery failed, trying SMTP fallback:", error);
    }
  }

  try {
    return await sendViaSmtp(submission, resultPageUrl);
  } catch (error) {
    console.error("[Consultation] SMTP delivery failed:", error);
    throw new Error("이메일 발송에 실패했습니다. 잠시 후 다시 시도해 주세요.");
  }
}
