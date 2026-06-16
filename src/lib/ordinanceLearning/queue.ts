import { generateOrdinanceDraft } from "@/lib/ordinanceLearning/generateDraft";
import { createOrdinanceSlug, extractFullRegionName } from "@/lib/ordinanceLearning/slug";
import {
  dequeueOrdinanceSlug,
  enqueueOrdinanceSlug,
  getOrdinanceRecord,
  saveOrdinanceRecord,
} from "@/lib/ordinanceLearning/storage";
import type { OrdinanceRecord, OrdinanceVersion } from "@/types/ordinanceLearning";

export interface EnqueueOrdinanceInput {
  address: string;
  municipalityLabel: string;
  searchedAt?: string;
}

export async function enqueueOrdinanceGeneration(input: EnqueueOrdinanceInput): Promise<{
  slug: string;
  queued: boolean;
  alreadyExists: boolean;
}> {
  const slug = createOrdinanceSlug(input.municipalityLabel);
  const existing = await getOrdinanceRecord(slug);

  if (existing?.status === "approved") {
    return { slug, queued: false, alreadyExists: true };
  }

  if (existing && ["ai_pending", "generating", "review"].includes(existing.status)) {
    return { slug, queued: false, alreadyExists: true };
  }

  const now = input.searchedAt ?? new Date().toISOString();
  const record: OrdinanceRecord = existing ?? {
    slug,
    municipalityLabel: input.municipalityLabel,
    fullRegionName: extractFullRegionName(input.address, input.municipalityLabel),
    status: "ai_pending",
    sourceType: "ai_draft",
    searchCount: 0,
    currentVersion: 0,
    versions: [],
    createdAt: now,
    updatedAt: now,
  };

  record.status = "ai_pending";
  record.fullRegionName = extractFullRegionName(input.address, input.municipalityLabel);
  record.updatedAt = now;
  await saveOrdinanceRecord(record);
  await enqueueOrdinanceSlug(slug);

  return { slug, queued: true, alreadyExists: false };
}

export async function processOrdinanceQueue(limit = 3): Promise<number> {
  let processed = 0;

  for (let i = 0; i < limit; i += 1) {
    const slug = await dequeueOrdinanceSlug();
    if (!slug) break;

    const record = await getOrdinanceRecord(slug);
    if (!record || record.status === "approved") continue;

    record.status = "generating";
    record.updatedAt = new Date().toISOString();
    await saveOrdinanceRecord(record);

    const draft = await generateOrdinanceDraft({
      slug: record.slug,
      municipalityLabel: record.municipalityLabel,
      fullRegionName: record.fullRegionName ?? record.municipalityLabel,
    });

    const version: OrdinanceVersion = {
      version: record.currentVersion + 1,
      data: draft,
      createdAt: new Date().toISOString(),
      createdBy: "ai",
      status: "review",
      changeNote: "AI 초안 자동 생성",
    };

    record.versions.push(version);
    record.currentVersion = version.version;
    record.status = "review";
    record.sourceType = "ai_draft";
    record.updatedAt = version.createdAt;
    await saveOrdinanceRecord(record);
    processed += 1;
  }

  return processed;
}

export async function approveOrdinanceRecord(slug: string): Promise<OrdinanceRecord | null> {
  const record = await getOrdinanceRecord(slug);
  if (!record || !record.versions.length) return null;

  const latest = record.versions[record.versions.length - 1];
  latest.status = "approved";

  record.status = "approved";
  record.reviewedAt = new Date().toISOString();
  record.updatedAt = record.reviewedAt;
  await saveOrdinanceRecord(record);
  return record;
}

export async function rejectOrdinanceRecord(slug: string): Promise<OrdinanceRecord | null> {
  const record = await getOrdinanceRecord(slug);
  if (!record) return null;

  record.status = "ai_pending";
  record.updatedAt = new Date().toISOString();
  await saveOrdinanceRecord(record);
  await enqueueOrdinanceSlug(slug);
  return record;
}
