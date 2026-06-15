import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import type { ConsultationRequestBody, ConsultationSubmission } from "@/types/consultation";

const CONSULTATION_DIR = path.join(process.cwd(), "data", "consultations");
const TMP_CONSULTATION_DIR = path.join("/tmp", "sgsolar-consultations");

export function getConsultationStorageDir(): string {
  return CONSULTATION_DIR;
}

export function createConsultationSubmission(
  input: ConsultationRequestBody,
): ConsultationSubmission {
  const submittedAt = new Date().toISOString();
  return {
    id: randomUUID(),
    submittedAt,
    name: input.name.trim(),
    phone: input.phone.trim(),
    address: input.address.trim(),
    installType: input.installType.trim(),
    message: (input.message ?? "").trim(),
    ...(input.email?.trim() ? { email: input.email.trim() } : {}),
    ...(input.resultPageUrl ? { resultPageUrl: input.resultPageUrl.trim() } : {}),
    ...(input.analysisContext ? { analysisContext: input.analysisContext } : {}),
  };
}

function isVercelRuntime(): boolean {
  return Boolean(process.env.VERCEL);
}

function shouldUseLocalDataDir(): boolean {
  return process.env.NODE_ENV === "development" || process.env.CONSULTATION_JSON_STORAGE === "true";
}

async function writeJsonRecord(dir: string, record: ConsultationSubmission): Promise<void> {
  await mkdir(dir, { recursive: true });
  const safeTimestamp = record.submittedAt.replace(/[:.]/g, "-");
  const filename = `${safeTimestamp}_${record.id}.json`;
  await writeFile(path.join(dir, filename), JSON.stringify(record, null, 2), "utf-8");
}

/** JSON 저장 시도 — 실패해도 throw하지 않음 (Production MVP: 이메일 우선) */
export async function trySaveConsultation(
  record: ConsultationSubmission,
): Promise<{ saved: boolean; location?: "data" | "tmp" }> {
  if (shouldUseLocalDataDir()) {
    try {
      await writeJsonRecord(CONSULTATION_DIR, record);
      return { saved: true, location: "data" };
    } catch (error) {
      console.warn("[Consultation] JSON storage skipped or failed", error);
      return { saved: false };
    }
  }

  if (isVercelRuntime()) {
    try {
      await writeJsonRecord(TMP_CONSULTATION_DIR, record);
      console.info("[Consultation] JSON stored in /tmp (ephemeral backup)");
      return { saved: true, location: "tmp" };
    } catch (error) {
      console.warn("[Consultation] JSON storage skipped or failed", error);
      return { saved: false };
    }
  }

  try {
    await writeJsonRecord(CONSULTATION_DIR, record);
    return { saved: true, location: "data" };
  } catch (error) {
    console.warn("[Consultation] JSON storage skipped or failed", error);
    return { saved: false };
  }
}

/** @deprecated trySaveConsultation + createConsultationSubmission 사용 */
export async function saveConsultation(
  input: ConsultationRequestBody,
): Promise<ConsultationSubmission> {
  const record = createConsultationSubmission(input);
  await trySaveConsultation(record);
  return record;
}
