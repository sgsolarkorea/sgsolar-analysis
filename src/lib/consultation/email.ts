import nodemailer from "nodemailer";
import { company, MARKETING_NAME, siteLinks } from "@/data/sampleData";
import type { ConsultationSubmission } from "@/types/consultation";

interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  receiver: string;
}

function getSmtpConfig(): SmtpConfig | null {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  const portRaw = process.env.SMTP_PORT?.trim();
  const receiver =
    process.env.CONSULTATION_RECEIVER_EMAIL?.trim() || "sgsolarkorea@naver.com";

  if (!host || !user || !pass) {
    return null;
  }

  const port = portRaw ? Number(portRaw) : 587;
  if (!Number.isFinite(port) || port <= 0) {
    return null;
  }

  return { host, port, user, pass, receiver };
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

function analysisContextLines(submission: ConsultationSubmission): string[] {
  const ctx = submission.analysisContext;
  if (!ctx) return [];

  return [
    "",
    "--- 입지검토 요약 ---",
    ctx.jibunAddress ? `지번주소: ${ctx.jibunAddress}` : "",
    ctx.landCategory ? `지목: ${ctx.landCategory}` : "",
    ctx.zoning ? `용도지역: ${ctx.zoning}` : "",
    ctx.buildingArea ? `건축면적: ${ctx.buildingArea}` : "",
    ctx.installType ? `설치유형: ${ctx.installType}` : "",
    ctx.capacity ? `예상 설치용량: ${ctx.capacity}` : "",
    ctx.annualGeneration ? `예상 발전량: ${ctx.annualGeneration}` : "",
    ctx.annualRevenue ? `예상 연매출: ${ctx.annualRevenue}` : "",
  ].filter(Boolean);
}

function buildStaffEmailContent(
  submission: ConsultationSubmission,
  resultPageUrl?: string,
): { subject: string; text: string; html: string } {
  const submittedAt = formatSubmittedAtKst(submission.submittedAt);
  const resultUrl = resultPageUrl?.trim() || "(미제공)";
  const message = submission.message || "(없음)";
  const email = submission.email || "(미입력)";

  const lines = [
    `신청일시: ${submittedAt}`,
    `이름: ${submission.name}`,
    `연락처: ${submission.phone}`,
    `이메일: ${email}`,
    `주소: ${submission.address}`,
    `설치유형: ${submission.installType}`,
    `문의내용: ${message}`,
    `결과 페이지: ${resultUrl}`,
    `접수 ID: ${submission.id}`,
    ...analysisContextLines(submission),
  ];

  const text = [`[SG SOLAR] 새 상담 신청`, "", ...lines].join("\n");

  const ctx = submission.analysisContext;
  const ctxHtml = ctx
    ? `
      <h3>입지검토 요약</h3>
      <table cellpadding="6" cellspacing="0" style="border-collapse:collapse;font-family:sans-serif;font-size:14px;">
        ${ctx.jibunAddress ? `<tr><td><strong>지번주소</strong></td><td>${ctx.jibunAddress}</td></tr>` : ""}
        ${ctx.landCategory ? `<tr><td><strong>지목</strong></td><td>${ctx.landCategory}</td></tr>` : ""}
        ${ctx.zoning ? `<tr><td><strong>용도지역</strong></td><td>${ctx.zoning}</td></tr>` : ""}
        ${ctx.buildingArea ? `<tr><td><strong>건축면적</strong></td><td>${ctx.buildingArea}</td></tr>` : ""}
        ${ctx.installType ? `<tr><td><strong>설치유형</strong></td><td>${ctx.installType}</td></tr>` : ""}
        ${ctx.capacity ? `<tr><td><strong>예상 설치용량</strong></td><td>${ctx.capacity}</td></tr>` : ""}
        ${ctx.annualGeneration ? `<tr><td><strong>예상 발전량</strong></td><td>${ctx.annualGeneration}</td></tr>` : ""}
        ${ctx.annualRevenue ? `<tr><td><strong>예상 연매출</strong></td><td>${ctx.annualRevenue}</td></tr>` : ""}
      </table>
    `
    : "";

  const html = `
    <h2>SG SOLAR 새 상담 신청</h2>
    <table cellpadding="6" cellspacing="0" style="border-collapse:collapse;font-family:sans-serif;font-size:14px;">
      <tr><td><strong>신청일시</strong></td><td>${submittedAt}</td></tr>
      <tr><td><strong>이름</strong></td><td>${submission.name}</td></tr>
      <tr><td><strong>연락처</strong></td><td>${submission.phone}</td></tr>
      <tr><td><strong>이메일</strong></td><td>${email}</td></tr>
      <tr><td><strong>주소</strong></td><td>${submission.address}</td></tr>
      <tr><td><strong>설치유형</strong></td><td>${submission.installType}</td></tr>
      <tr><td><strong>문의내용</strong></td><td>${message.replace(/\n/g, "<br>")}</td></tr>
      <tr><td><strong>결과 페이지</strong></td><td>${
        resultPageUrl?.trim()
          ? `<a href="${resultPageUrl}">${resultPageUrl}</a>`
          : "(미제공)"
      }</td></tr>
      <tr><td><strong>접수 ID</strong></td><td>${submission.id}</td></tr>
    </table>
    ${ctxHtml}
  `.trim();

  return {
    subject: `[SG SOLAR] 상담신청 - ${submission.name} (${submission.address})`,
    text,
    html,
  };
}

function buildCustomerAutoReply(submission: ConsultationSubmission): {
  subject: string;
  text: string;
  html: string;
} {
  const subject = `[${MARKETING_NAME}] 태양광 입지검토 상담 신청이 접수되었습니다.`;
  const website = siteLinks.mainSite.replace(/^https?:\/\//, "");

  const text = [
    `${submission.name}님, 안녕하세요.`,
    "",
    `${MARKETING_NAME} 태양광 입지검토 상담 신청이 정상 접수되었습니다.`,
    "",
    `신청자명: ${submission.name}`,
    `주소: ${submission.address}`,
    `설치유형: ${submission.installType}`,
    "",
    "담당자가 내용을 확인한 후 순차적으로 연락드리겠습니다.",
    "추가 문의: " + company.phone + " / " + company.email,
    "",
    `홈페이지: ${siteLinks.mainSite}`,
  ].join("\n");

  const html = `
    <p>${submission.name}님, 안녕하세요.</p>
    <p><strong>${MARKETING_NAME}</strong> 태양광 입지검토 상담 신청이 정상 접수되었습니다.</p>
    <ul>
      <li>신청자명: ${submission.name}</li>
      <li>주소: ${submission.address}</li>
      <li>설치유형: ${submission.installType}</li>
    </ul>
    <p>담당자가 내용을 확인한 후 순차적으로 연락드리겠습니다.</p>
    <p>추가 문의: ${company.phone} · ${company.email}</p>
    <p><a href="${siteLinks.mainSite}">${website}</a></p>
  `.trim();

  return { subject, text, html };
}

export async function sendConsultationEmail(
  submission: ConsultationSubmission,
  resultPageUrl?: string,
): Promise<{ sent: boolean; autoReplySent: boolean; reason?: string }> {
  const config = getSmtpConfig();
  if (!config) {
    console.warn("[Consultation] SMTP not configured — email skipped, JSON saved.");
    return { sent: false, autoReplySent: false, reason: "smtp_not_configured" };
  }

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });

  const staff = buildStaffEmailContent(submission, resultPageUrl);

  await transporter.sendMail({
    from: `"SG SOLAR 상담신청" <${config.user}>`,
    to: config.receiver,
    subject: staff.subject,
    text: staff.text,
    html: staff.html,
  });

  console.info(`[Consultation] Notification email sent to ${config.receiver}`);

  let autoReplySent = false;
  const customerEmail = submission.email?.trim();
  if (customerEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
    const autoReply = buildCustomerAutoReply(submission);
    await transporter.sendMail({
      from: `"${MARKETING_NAME}" <${config.user}>`,
      to: customerEmail,
      subject: autoReply.subject,
      text: autoReply.text,
      html: autoReply.html,
    });
    autoReplySent = true;
    console.info(`[Consultation] Auto-reply sent to ${customerEmail}`);
  }

  return { sent: true, autoReplySent };
}
