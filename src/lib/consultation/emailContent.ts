import { company, MARKETING_NAME, siteLinks } from "@/data/sampleData";
import type { ConsultationAnalysisContext, ConsultationSubmission } from "@/types/consultation";

export function getConsultationReceiverEmail(): string {
  return process.env.CONSULTATION_RECEIVER_EMAIL?.trim() || "sgsolarkorea@naver.com";
}

export function getResendFromEmail(): string {
  const configured = process.env.RESEND_FROM_EMAIL?.trim();
  if (configured) return configured;
  return `${MARKETING_NAME} <onboarding@resend.dev>`;
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

function formatInstallTypeLabel(value: string): string {
  return value.trim() || "선택";
}

function displayValue(value: string | undefined, fallback = "(미입력)"): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}

interface StaffEmailRow {
  label: string;
  value: string;
}

function buildStaffEmailRows(
  submission: ConsultationSubmission,
  resultPageUrl?: string,
): StaffEmailRow[] {
  const ctx: ConsultationAnalysisContext = submission.analysisContext ?? {};
  const pageUrl = resultPageUrl?.trim() || submission.resultPageUrl?.trim() || "";

  return [
    { label: "신청일시", value: formatSubmittedAtKst(submission.submittedAt) },
    { label: "이름", value: submission.name },
    { label: "연락처", value: submission.phone },
    { label: "이메일", value: displayValue(submission.email) },
    { label: "주소", value: submission.address },
    { label: "설치유형", value: formatInstallTypeLabel(submission.installType) },
    { label: "문의내용", value: submission.message || "(없음)" },
    { label: "지목", value: displayValue(ctx.landCategory, "확인 필요") },
    { label: "용도지역", value: displayValue(ctx.zoning, "확인 필요") },
    { label: "토지면적", value: displayValue(ctx.totalLandArea ?? ctx.landArea, "확인 필요") },
    ...(ctx.parcelCount && ctx.parcelCount > 1
      ? [
          { label: "필지 수", value: `${ctx.parcelCount}필지` },
          {
            label: "필지 목록",
            value:
              ctx.parcels?.map((p) => `${p.jibunAddress} ${p.areaLabel}`).join(" / ") ?? "(미제공)",
          },
        ]
      : []),
    { label: "건축면적", value: displayValue(ctx.buildingArea, "확인 필요") },
    { label: "예상 설치용량", value: displayValue(ctx.capacity, "별도 확인") },
    { label: "예상 발전량", value: displayValue(ctx.annualGeneration, "별도 확인") },
    { label: "예상 연매출", value: displayValue(ctx.annualRevenue, "별도 확인") },
    { label: "결과페이지 URL", value: pageUrl || "(미제공)" },
    ...(ctx.jibunAddress ? [{ label: "지번주소", value: ctx.jibunAddress }] : []),
    { label: "접수 ID", value: submission.id },
  ];
}

export function buildStaffEmailContent(
  submission: ConsultationSubmission,
  resultPageUrl?: string,
): { subject: string; text: string; html: string } {
  const rows = buildStaffEmailRows(submission, resultPageUrl);
  const pageUrl = resultPageUrl?.trim() || submission.resultPageUrl?.trim() || "";

  const text = [
    "[SG SOLAR] 새 상담 신청",
    "",
    ...rows.map((row) => `${row.label}: ${row.value}`),
  ].join("\n");

  const htmlRows = rows
    .map((row) => {
      const value =
        row.label === "결과페이지 URL" && pageUrl
          ? `<a href="${pageUrl}">${pageUrl}</a>`
          : row.label === "문의내용"
            ? row.value.replace(/\n/g, "<br>")
            : row.value;
      return `<tr><td><strong>${row.label}</strong></td><td>${value}</td></tr>`;
    })
    .join("");

  const html = `
    <h2>SG SOLAR 새 상담 신청</h2>
    <table cellpadding="6" cellspacing="0" style="border-collapse:collapse;font-family:sans-serif;font-size:14px;">
      ${htmlRows}
    </table>
  `.trim();

  return {
    subject: `[SG SOLAR] 상담신청 - ${submission.name} (${submission.address})`,
    text,
    html,
  };
}

export function buildCustomerAutoReply(submission: ConsultationSubmission): {
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
    `설치유형: ${formatInstallTypeLabel(submission.installType)}`,
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
      <li>설치유형: ${formatInstallTypeLabel(submission.installType)}</li>
    </ul>
    <p>담당자가 내용을 확인한 후 순차적으로 연락드리겠습니다.</p>
    <p>추가 문의: ${company.phone} · ${company.email}</p>
    <p><a href="${siteLinks.mainSite}">${website}</a></p>
  `.trim();

  return { subject, text, html };
}
