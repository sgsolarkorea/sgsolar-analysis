import nodemailer from "nodemailer";
import { Resend } from "resend";
import { getConsultationReceiverEmail, getResendFromEmail } from "@/lib/consultation/emailContent";
import type { SearchHistoryEntry } from "@/types/searchHistory";

function formatSearchedAtKst(iso: string): string {
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

function buildSearchNotificationContent(entry: SearchHistoryEntry): {
  subject: string;
  text: string;
  html: string;
} {
  const rows = [
    ["조회일시", formatSearchedAtKst(entry.searchedAt)],
    ["주소", entry.address],
    ["지목", entry.landCategory],
    ["용도지역", entry.zoning],
    ["토지면적", entry.landArea],
    ["건축면적", entry.buildingArea],
    ["예상 설치용량", entry.capacity],
    ["예상 연매출", entry.annualRevenue],
  ] as const;

  const text = [
    "[SG SOLAR] 신규 입지검토 조회",
    "",
    ...rows.map(([label, value]) => `${label}: ${value}`),
    "",
    "※ 상담신청 전 단계 조회 데이터",
  ].join("\n");

  const htmlRows = rows
    .map(([label, value]) => `<tr><td><strong>${label}</strong></td><td>${value}</td></tr>`)
    .join("");

  const html = `
    <h2>SG SOLAR 신규 입지검토 조회</h2>
    <table cellpadding="6" cellspacing="0" style="border-collapse:collapse;font-family:sans-serif;font-size:14px;">
      ${htmlRows}
    </table>
    <p style="margin-top:16px;color:#666;font-size:13px;">※ 상담신청 전 단계 조회 데이터</p>
  `.trim();

  return {
    subject: "[SG SOLAR] 신규 입지검토 조회",
    text,
    html,
  };
}

async function sendViaResend(entry: SearchHistoryEntry): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return false;

  const resend = new Resend(apiKey);
  const content = buildSearchNotificationContent(entry);
  const { error } = await resend.emails.send({
    from: getResendFromEmail(),
    to: [getConsultationReceiverEmail()],
    subject: content.subject,
    text: content.text,
    html: content.html,
  });

  if (error) {
    console.warn("[SearchHistory] Resend notification failed:", error);
    return false;
  }

  console.info(
    `[SearchHistory] New search notification sent via Resend to ${getConsultationReceiverEmail()} (entry=${entry.id})`,
  );
  return true;
}

async function sendViaSmtp(entry: SearchHistoryEntry): Promise<boolean> {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  const portRaw = process.env.SMTP_PORT?.trim();
  if (!host || !user || !pass) return false;

  const port = portRaw ? Number(portRaw) : 587;
  const content = buildSearchNotificationContent(entry);

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    requireTLS: port === 587,
    auth: { user, pass },
    connectionTimeout: 15_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
    tls: { minVersion: "TLSv1.2" },
  });

  await transporter.sendMail({
    from: `"SG SOLAR" <${user}>`,
    to: getConsultationReceiverEmail(),
    subject: content.subject,
    text: content.text,
    html: content.html,
  });

  console.info(
    `[SearchHistory] New search notification sent via SMTP to ${getConsultationReceiverEmail()} (entry=${entry.id})`,
  );
  return true;
}

/** 신규 조회 알림 — 실패해도 throw하지 않음 */
export async function sendSearchHistoryNotification(entry: SearchHistoryEntry): Promise<boolean> {
  try {
    if (process.env.RESEND_API_KEY?.trim()) {
      const sent = await sendViaResend(entry);
      if (sent) return true;
    }
    return await sendViaSmtp(entry);
  } catch (error) {
    console.warn("[SearchHistory] Email notification failed:", error);
    return false;
  }
}
