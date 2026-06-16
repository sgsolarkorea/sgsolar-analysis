import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb } from "pdf-lib";
import type { ResolvedSiteReview } from "@/types/siteReview";
import type { ParcelSnapshot } from "@/types/parcelReview";
import { formatParcelShortLabel } from "@/lib/parcels/format";
import { MARKETING_NAME, company } from "@/data/sampleData";
import { getFieldValue } from "@/lib/solar/calculate";
import { formatRecWeightDisplay } from "@/lib/solar/formatRecWeight";

const KR_FONT_URL =
  "https://cdn.jsdelivr.net/fontsource/fonts/noto-sans-kr@latest/korean-400-normal.ttf";

let cachedFontBytes: ArrayBuffer | null = null;

function todayFileDate(): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul" }).format(new Date());
}

async function loadKoreanFontBytes(): Promise<ArrayBuffer> {
  if (cachedFontBytes) return cachedFontBytes;
  const response = await fetch(KR_FONT_URL, { cache: "force-cache" });
  if (!response.ok) {
    throw new Error(`PDF font load failed: HTTP ${response.status}`);
  }
  cachedFontBytes = await response.arrayBuffer();
  return cachedFontBytes;
}

function wrapText(text: string, maxLen: number): string[] {
  const lines: string[] = [];
  let current = "";
  for (const char of text) {
    if (current.length >= maxLen) {
      lines.push(current);
      current = char;
    } else {
      current += char;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function sectionLines(data: ResolvedSiteReview, parcels?: ParcelSnapshot[]): string[] {
  const m = data.solarMetrics;
  const landCategory = getFieldValue(data.landInfo, "지목");
  const zoning = getFieldValue(data.landInfo, "용도지역");
  const buildingArea = getFieldValue(data.buildingInfo, "건축면적");

  const parcelLines =
    parcels && parcels.length > 0
      ? [
          `[ 다중 필지 (${parcels.length}필지) ]`,
          ...parcels.map(
            (parcel, index) =>
              `${index + 1}. ${formatParcelShortLabel(parcel.jibunAddress)} ${parcel.areaLabel}${parcel.isPrimary ? " (대표)" : ""}`,
          ),
          `총면적: ${parcels.reduce((sum, p) => sum + p.areaSqm, 0).toLocaleString("ko-KR")}㎡`,
          "",
        ]
      : [];

  return [
    "태양광 입지검토 1차 제안서",
    "",
    `작성: ${MARKETING_NAME}`,
    `작성일: ${data.analyzedAt}`,
    "",
    "[ 주소 ]",
    `도로명: ${data.address}`,
    `지번: ${data.jibunAddress}`,
    `좌표: ${data.lat.toFixed(6)}, ${data.lng.toFixed(6)}`,
    data.zoneNo ? `우편번호: ${data.zoneNo}` : "",
    "",
    ...parcelLines,
    "[ 토지 정보 ]",
    `지목: ${landCategory}`,
    `용도지역: ${zoning}`,
    `면적: ${getFieldValue(data.landInfo, "면적")}`,
    "",
    "[ 건축물 정보 ]",
    `건축면적: ${buildingArea}`,
    `건물 용도: ${getFieldValue(data.buildingInfo, "건물 용도")}`,
    "",
    "[ 설치유형 · 용량 ]",
    `유형: ${m.installType}`,
    `기준면적: ${m.baseAreaLabel} ${m.baseAreaSqm}㎡`,
    `산식: ${m.formula}`,
    `예상 용량: ${data.capacity}`,
    `모듈: ${m.modulePowerW}W × ${m.moduleCount}장`,
    "",
    "[ 발전량 · 수익 ]",
    `연간 발전량: ${data.annualGeneration}`,
    `SMP: ${m.market.smpPrice}원/kWh (${m.market.smpDate})`,
    `REC: ${m.market.recPrice}원/MWh (${m.market.recDate})`,
    `REC 가중치: ${formatRecWeightDisplay(m.recWeight)} (${m.recWeightReason})`,
    `SMP 수익: ${data.profitability.smpRevenue}`,
    `REC 수익: ${data.profitability.recRevenue}`,
    `연간 예상 수익: ${data.annualRevenue}`,
    `연간 순수익: ${data.profitability.annualNetProfit ?? data.annualRevenue}`,
    `투자비 회수: ${data.profitability.paybackPeriod}`,
    `ROI (20년): ${data.profitability.roi ?? "별도 확인"}`,
    `IRR (20년): ${data.profitability.irr ?? "별도 확인"}`,
    `20년 누적 매출: ${data.profitability.cumulative20YearRevenue ?? "별도 확인"}`,
    `20년 누적 순수익: ${data.profitability.cumulative20YearNetProfit ?? "별도 확인"}`,
    "",
    "[ 시공비 ]",
    `예상 시공비: ${data.constructionCost}`,
    `kW당 단가: ${data.profitability.constructionCostPerKw ?? "별도 확인"}`,
    "",
    "[ 계통 연계 ]",
    `상태: ${data.gridInfo.statusLabel}`,
    `변전소: ${data.gridInfo.substation.name}`,
    `변압기: ${data.gridInfo.transformer.name}`,
    `배전선로: ${data.gridInfo.distributionLine.name}`,
    `D/L 잔여: ${data.gridInfo.remainingCapacityDisplay}`,
    `검토: ${data.gridInfo.reviewResult}`,
    "",
    "[ 유사 시공사례 ]",
    ...data.recommendedCases.slice(0, 3).map((c, i) => `${i + 1}. ${c.title} (${c.capacity})`),
    "",
    "[ 상담 문의 ]",
    `전화: ${company.phone}`,
    `이메일: ${company.email}`,
    `웹사이트: ${company.website}`,
    "",
    "※ 본 제안서는 참고용 1차 검토이며, 최종 설치·수익은 현장 실사 후 확정됩니다.",
  ].filter(Boolean);
}

export async function generateSiteReviewPdf(
  data: ResolvedSiteReview,
  parcels?: ParcelSnapshot[],
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  const fontBytes = await loadKoreanFontBytes();
  const font = await pdfDoc.embedFont(fontBytes);
  const fontBold = font;

  pdfDoc.setTitle("태양광 입지검토 1차 제안서");
  pdfDoc.setSubject(`${data.address} 입지검토 결과`);
  pdfDoc.setCreator(MARKETING_NAME);

  let page = pdfDoc.addPage([595, 842]);
  const { height } = page.getSize();
  let y = height - 50;
  const margin = 50;
  const lineHeight = 16;

  page.drawText("태양광 입지검토 1차 제안서", {
    x: margin,
    y,
    size: 18,
    font: fontBold,
    color: rgb(0.1, 0.15, 0.3),
  });
  y -= 32;

  for (const rawLine of sectionLines(data, parcels)) {
    const isHeading = rawLine.startsWith("[") || rawLine.startsWith("태양광");
    const lines = wrapText(rawLine, isHeading ? 40 : 44);
    for (const line of lines) {
      if (y < 60) {
        page = pdfDoc.addPage([595, 842]);
        y = height - 50;
      }
      page.drawText(line, {
        x: margin,
        y,
        size: isHeading ? 11 : 10,
        font: isHeading ? fontBold : font,
        color: rgb(0.15, 0.15, 0.15),
        maxWidth: 495,
      });
      y -= lineHeight;
    }
  }

  return pdfDoc.save();
}

export function siteReviewPdfFilename(): string {
  return `sgsolar-site-review-${todayFileDate().replace(/-/g, "")}.pdf`;
}
