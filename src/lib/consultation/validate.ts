import type {
  ConsultationAnalysisContext,
  ConsultationRequestBody,
} from "@/types/consultation";
import { CONSULTATION_INSTALL_TYPE_OPTIONS } from "@/types/siteReview";

const MAX = {
  name: 50,
  phone: 30,
  email: 120,
  address: 200,
  message: 2000,
  resultPageUrl: 500,
} as const;

const ALLOWED_INSTALL_TYPES = new Set<string>(
  CONSULTATION_INSTALL_TYPE_OPTIONS.map((option) => option.value),
);

export type ConsultationValidationResult =
  | { ok: true; data: ConsultationRequestBody }
  | { ok: false; error: string };

export function validateConsultationBody(body: unknown): ConsultationValidationResult {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "요청 형식이 올바르지 않습니다." };
  }

  const raw = body as Record<string, unknown>;
  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  const phone = typeof raw.phone === "string" ? raw.phone.trim() : "";
  const address = typeof raw.address === "string" ? raw.address.trim() : "";
  const installType =
    typeof raw.installType === "string" ? raw.installType.trim() : "";
  const message = typeof raw.message === "string" ? raw.message.trim() : "";
  const email = typeof raw.email === "string" ? raw.email.trim() : "";
  const resultPageUrl =
    typeof raw.resultPageUrl === "string" ? raw.resultPageUrl.trim() : "";
  const searchHistoryId =
    typeof raw.searchHistoryId === "string" ? raw.searchHistoryId.trim() : "";

  if (!name) return { ok: false, error: "이름을 입력해 주세요." };
  if (!phone) return { ok: false, error: "연락처를 입력해 주세요." };
  if (!address) return { ok: false, error: "설치 희망 주소를 입력해 주세요." };
  if (name.length > MAX.name) return { ok: false, error: "이름이 너무 깁니다." };
  if (phone.length > MAX.phone) return { ok: false, error: "연락처가 너무 깁니다." };
  if (address.length > MAX.address) return { ok: false, error: "주소가 너무 깁니다." };
  if (message.length > MAX.message) return { ok: false, error: "문의내용이 너무 깁니다." };
  if (email.length > MAX.email) return { ok: false, error: "이메일이 너무 깁니다." };
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "이메일 형식이 올바르지 않습니다." };
  }
  if (resultPageUrl.length > MAX.resultPageUrl) {
    return { ok: false, error: "결과 페이지 주소가 너무 깁니다." };
  }
  if (searchHistoryId && !/^[0-9a-f-]{36}$/i.test(searchHistoryId)) {
    return { ok: false, error: "조회 이력 ID 형식이 올바르지 않습니다." };
  }
  if (
    resultPageUrl &&
    !/^https?:\/\//i.test(resultPageUrl)
  ) {
    return { ok: false, error: "결과 페이지 주소 형식이 올바르지 않습니다." };
  }
  if (!ALLOWED_INSTALL_TYPES.has(installType)) {
    return { ok: false, error: "설치 유형이 올바르지 않습니다." };
  }

  let analysisContext: ConsultationAnalysisContext | undefined;
  if (raw.analysisContext && typeof raw.analysisContext === "object") {
    const ctx = raw.analysisContext as Record<string, unknown>;
    analysisContext = {
      ...(typeof ctx.jibunAddress === "string" ? { jibunAddress: ctx.jibunAddress.slice(0, 200) } : {}),
      ...(typeof ctx.landCategory === "string" ? { landCategory: ctx.landCategory.slice(0, 50) } : {}),
      ...(typeof ctx.zoning === "string" ? { zoning: ctx.zoning.slice(0, 100) } : {}),
      ...(typeof ctx.landArea === "string" ? { landArea: ctx.landArea.slice(0, 50) } : {}),
      ...(typeof ctx.buildingArea === "string" ? { buildingArea: ctx.buildingArea.slice(0, 50) } : {}),
      ...(typeof ctx.installType === "string" ? { installType: ctx.installType.slice(0, 50) } : {}),
      ...(typeof ctx.capacity === "string" ? { capacity: ctx.capacity.slice(0, 50) } : {}),
      ...(typeof ctx.annualGeneration === "string" ? { annualGeneration: ctx.annualGeneration.slice(0, 50) } : {}),
      ...(typeof ctx.annualRevenue === "string" ? { annualRevenue: ctx.annualRevenue.slice(0, 50) } : {}),
    };
  }

  return {
    ok: true,
    data: {
      name,
      phone,
      address,
      installType,
      message,
      ...(email ? { email } : {}),
      ...(resultPageUrl ? { resultPageUrl } : {}),
      ...(analysisContext ? { analysisContext } : {}),
      ...(searchHistoryId ? { searchHistoryId } : {}),
    },
  };
}
