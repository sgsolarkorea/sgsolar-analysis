import fs from "node:fs";
import path from "node:path";
import { caseStudies, publishedCaseStudies, type CaseStudy } from "@/data/caseStudies";

const THUMB_FILENAME = "thumb.webp";

/** public/case-studies/{id}/thumb.webp 절대 경로 */
export function caseStudyThumbnailFilePath(caseStudyId: string): string {
  return path.join(process.cwd(), "public", "case-studies", caseStudyId, THUMB_FILENAME);
}

/** `/case-studies/{id}/thumb.webp` → public 절대 경로 */
export function caseStudyThumbnailSrcToFilePath(thumbnailSrc: string): string | null {
  const normalized = thumbnailSrc.trim();
  if (!normalized.startsWith("/case-studies/")) return null;
  const relative = normalized.replace(/^\//, "").split("/").join(path.sep);
  return path.join(process.cwd(), "public", relative);
}

export function caseStudyThumbnailExists(caseStudyId: string): boolean {
  return fs.existsSync(caseStudyThumbnailFilePath(caseStudyId));
}

/**
 * SimilarCases UI fallback 예상값
 * - thumbnail.src 없음 → fallback
 * - public 파일 없음 → Image onError → fallback
 * - 파일 존재 → 실제 이미지 (fallback false)
 */
export function expectsCaseStudyThumbnailFallback(thumbnailSrc: string): boolean {
  if (!thumbnailSrc.trim()) return true;
  const filePath = caseStudyThumbnailSrcToFilePath(thumbnailSrc);
  if (!filePath) return true;
  return !fs.existsSync(filePath);
}

export interface CaseStudyThumbnailAuditRow {
  id: string;
  title: string;
  thumbnailSrc: string;
  publicFilePath: string;
  fileExists: boolean;
  expectedUiFallback: boolean;
}

export function auditCaseStudyThumbnails(pool: CaseStudy[] = publishedCaseStudies): CaseStudyThumbnailAuditRow[] {
  return pool.map((item) => {
    const publicFilePath = caseStudyThumbnailFilePath(item.id);
    const fileExists = fs.existsSync(publicFilePath);
    return {
      id: item.id,
      title: item.title,
      thumbnailSrc: item.thumbnail.src,
      publicFilePath,
      fileExists,
      expectedUiFallback: !fileExists,
    };
  });
}

export function findCaseStudyById(caseStudyId: string): CaseStudy | undefined {
  return caseStudies.find((item) => item.id === caseStudyId);
}

export const CASE_STUDY_THUMB_WIDTH = 800;
export const CASE_STUDY_THUMB_HEIGHT = 450;
export const CASE_STUDY_THUMB_MAX_BYTES = 300 * 1024;
