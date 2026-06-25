import type { ConsultationAnalysisContext } from "@/types/consultation";
import { parseConsultationAnalysisContext } from "@/lib/consultation/analysisContextFields";
import type { LeadRequestBody, LeadType } from "@/types/lead";
import { CONSULTATION_INSTALL_TYPE_OPTIONS } from "@/types/siteReview";

const MAX = {
  name: 50,
  phone: 30,
  email: 120,
  address: 200,
  message: 2000,
  url: 500,
} as const;

const LEAD_TYPES = new Set<LeadType>(["pdf_download", "consultation", "save_result"]);

const ALLOWED_INSTALL_TYPES = new Set<string>(
  CONSULTATION_INSTALL_TYPE_OPTIONS.map((option) => option.value),
);

export type LeadValidationResult =
  | { ok: true; data: LeadRequestBody }
  | { ok: false; error: string };

function normalizePhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 9 || digits.length > 15) {
    return "";
  }
  return value.trim();
}

function parseAnalysisContext(raw: unknown): ConsultationAnalysisContext | undefined {
  return parseConsultationAnalysisContext(raw);
}

export function validateLeadBody(body: unknown): LeadValidationResult {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "요청 형식이 올바르지 않습니다." };
  }

  const raw = body as Record<string, unknown>;
  const leadType = typeof raw.leadType === "string" ? raw.leadType.trim() : "";
  if (!LEAD_TYPES.has(leadType as LeadType)) {
    return { ok: false, error: "리드 유형이 올바르지 않습니다." };
  }

  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  const phoneRaw = typeof raw.phone === "string" ? raw.phone.trim() : "";
  const phone = normalizePhone(phoneRaw);
  const address = typeof raw.address === "string" ? raw.address.trim() : "";
  const email = typeof raw.email === "string" ? raw.email.trim() : "";
  const installType = typeof raw.installType === "string" ? raw.installType.trim() : "";
  const message = typeof raw.message === "string" ? raw.message.trim() : "";
  const resultUrl =
    (typeof raw.resultUrl === "string" ? raw.resultUrl.trim() : "") ||
    (typeof raw.resultPageUrl === "string" ? raw.resultPageUrl.trim() : "");
  const pdfUrl = typeof raw.pdfUrl === "string" ? raw.pdfUrl.trim() : "";
  const searchHistoryId = typeof raw.searchHistoryId === "string" ? raw.searchHistoryId.trim() : "";

  let estimatedCapacityKw: number | null | undefined;
  if (raw.estimatedCapacityKw === null) {
    estimatedCapacityKw = null;
  } else if (typeof raw.estimatedCapacityKw === "number" && Number.isFinite(raw.estimatedCapacityKw)) {
    estimatedCapacityKw = raw.estimatedCapacityKw;
  } else if (typeof raw.estimatedCapacityKw === "string" && raw.estimatedCapacityKw.trim()) {
    const parsed = Number(raw.estimatedCapacityKw);
    estimatedCapacityKw = Number.isFinite(parsed) ? parsed : undefined;
  }

  if (!phone) return { ok: false, error: "연락처를 올바르게 입력해 주세요." };
  if (!address) return { ok: false, error: "주소 정보가 필요합니다." };
  if (phone.length > MAX.phone) return { ok: false, error: "연락처가 너무 깁니다." };
  if (address.length > MAX.address) return { ok: false, error: "주소가 너무 깁니다." };

  if (leadType === "save_result") {
    return {
      ok: true,
      data: {
        leadType: "save_result",
        phone,
        address,
        ...(resultUrl ? { resultUrl } : {}),
        ...(pdfUrl ? { pdfUrl } : {}),
        ...(estimatedCapacityKw != null ? { estimatedCapacityKw } : {}),
        ...(installType ? { installType } : {}),
      },
    };
  }

  if (!name) return { ok: false, error: "이름을 입력해 주세요." };
  if (name.length > MAX.name) return { ok: false, error: "이름이 너무 깁니다." };
  if (email.length > MAX.email) return { ok: false, error: "이메일이 너무 깁니다." };
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "이메일 형식이 올바르지 않습니다." };
  }
  if (message.length > MAX.message) return { ok: false, error: "문의내용이 너무 깁니다." };
  if (resultUrl.length > MAX.url || pdfUrl.length > MAX.url) {
    return { ok: false, error: "URL이 너무 깁니다." };
  }
  if (resultUrl && !/^https?:\/\//i.test(resultUrl)) {
    return { ok: false, error: "결과 페이지 URL 형식이 올바르지 않습니다." };
  }
  if (pdfUrl && !/^https?:\/\//i.test(pdfUrl)) {
    return { ok: false, error: "PDF URL 형식이 올바르지 않습니다." };
  }
  if (searchHistoryId && !/^[0-9a-f-]{36}$/i.test(searchHistoryId)) {
    return { ok: false, error: "조회 이력 ID 형식이 올바르지 않습니다." };
  }

  if (leadType === "consultation") {
    if (!ALLOWED_INSTALL_TYPES.has(installType)) {
      return { ok: false, error: "설치 유형이 올바르지 않습니다." };
    }
  }

  const analysisContext = parseAnalysisContext(raw.analysisContext);

  return {
    ok: true,
    data: {
      leadType: leadType as LeadType,
      name,
      phone,
      address,
      ...(email ? { email } : {}),
      ...(installType ? { installType } : {}),
      ...(message ? { message } : {}),
      ...(resultUrl ? { resultUrl } : {}),
      ...(pdfUrl ? { pdfUrl } : {}),
      ...(estimatedCapacityKw != null ? { estimatedCapacityKw } : {}),
      ...(searchHistoryId ? { searchHistoryId } : {}),
      ...(analysisContext ? { analysisContext } : {}),
    },
  };
}
