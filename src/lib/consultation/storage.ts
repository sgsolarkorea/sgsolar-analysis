import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import type { ConsultationRequestBody, ConsultationSubmission } from "@/types/consultation";

const CONSULTATION_DIR = path.join(process.cwd(), "data", "consultations");

export function getConsultationStorageDir(): string {
  return CONSULTATION_DIR;
}

export async function saveConsultation(
  input: ConsultationRequestBody,
): Promise<ConsultationSubmission> {
  await mkdir(CONSULTATION_DIR, { recursive: true });

  const submittedAt = new Date().toISOString();
  const id = randomUUID();
  const record: ConsultationSubmission = {
    id,
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

  const safeTimestamp = submittedAt.replace(/[:.]/g, "-");
  const filename = `${safeTimestamp}_${id}.json`;
  await writeFile(
    path.join(CONSULTATION_DIR, filename),
    JSON.stringify(record, null, 2),
    "utf-8",
  );

  return record;
}
