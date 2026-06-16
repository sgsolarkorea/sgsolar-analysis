import buanOrdinance from "@/data/ordinances/buan.json";
import eumseongOrdinance from "@/data/ordinances/eumseong.json";
import gunsanOrdinance from "@/data/ordinances/gunsan.json";
import jeonjuOrdinance from "@/data/ordinances/jeonju.json";
import {
  extractMunicipalityLabel,
  listOrdinanceSlugs,
  loadMunicipalityOrdinance,
} from "@/lib/regulatory/loadOrdinance";
import { enqueueOrdinanceGeneration, processOrdinanceQueue } from "@/lib/ordinanceLearning/queue";
import { createOrdinanceSlug } from "@/lib/ordinanceLearning/slug";
import {
  getOrdinanceRecord,
  incrementOrdinanceSearchCount,
  listOrdinanceRecords,
} from "@/lib/ordinanceLearning/storage";
import type {
  OrdinanceDisplayStatus,
  OrdinanceLoadMeta,
  OrdinanceLoadResult,
  OrdinanceRecordStatus,
} from "@/types/ordinanceLearning";
import type { MunicipalityOrdinanceData } from "@/types/regulatoryReview";

const STATIC_ORDINANCES: MunicipalityOrdinanceData[] = [
  jeonjuOrdinance as MunicipalityOrdinanceData,
  eumseongOrdinance as MunicipalityOrdinanceData,
  gunsanOrdinance as MunicipalityOrdinanceData,
  buanOrdinance as MunicipalityOrdinanceData,
];

const STATIC_SLUGS = new Set(listOrdinanceSlugs());

function isStaticApprovedSlug(slug: string): boolean {
  return STATIC_SLUGS.has(slug);
}

function buildMeta(input: {
  slug: string;
  municipalityLabel: string;
  status: OrdinanceRecordStatus;
  displayStatus: OrdinanceDisplayStatus;
  sourceType: OrdinanceLoadMeta["sourceType"];
  reviewedAt?: string;
  version?: number;
  isPreparing: boolean;
}): OrdinanceLoadMeta {
  return input;
}

function getApprovedDynamicData(record: Awaited<ReturnType<typeof getOrdinanceRecord>>) {
  if (!record || record.status !== "approved" || !record.versions.length) return null;
  return record.versions[record.versions.length - 1]?.data ?? null;
}

export async function resolveOrdinanceForAddress(address: string): Promise<OrdinanceLoadResult> {
  const municipalityLabel = extractMunicipalityLabel(address);
  const slug = createOrdinanceSlug(municipalityLabel);
  const searchedAt = new Date().toISOString();

  await incrementOrdinanceSearchCount(slug, municipalityLabel, searchedAt);

  if (isStaticApprovedSlug(slug)) {
    const data = loadMunicipalityOrdinance(address);
    return {
      data,
      meta: buildMeta({
        slug,
        municipalityLabel,
        status: "approved",
        displayStatus: "verified",
        sourceType: "static",
        reviewedAt: "2026-06-16",
        version: 1,
        isPreparing: false,
      }),
    };
  }

  const dynamicRecord = await getOrdinanceRecord(slug);
  const approvedDynamic = getApprovedDynamicData(dynamicRecord);
  if (approvedDynamic) {
    return {
      data: approvedDynamic,
      meta: buildMeta({
        slug,
        municipalityLabel,
        status: "approved",
        displayStatus: dynamicRecord?.sourceType === "ai_draft" ? "verified" : "verified",
        sourceType: dynamicRecord?.sourceType ?? "ai_draft",
        reviewedAt: dynamicRecord?.reviewedAt,
        version: dynamicRecord?.currentVersion,
        isPreparing: false,
      }),
    };
  }

  if (
    dynamicRecord &&
    (dynamicRecord.status === "ai_pending" ||
      dynamicRecord.status === "generating" ||
      dynamicRecord.status === "review")
  ) {
    if (dynamicRecord.status === "ai_pending") {
      void enqueueOrdinanceGeneration({ address, municipalityLabel, searchedAt });
      void processOrdinanceQueue(1);
    }

    return {
      data: null,
      meta: buildMeta({
        slug,
        municipalityLabel,
        status: dynamicRecord.status,
        displayStatus: "preparing",
        sourceType: "ai_draft",
        isPreparing: true,
      }),
    };
  }

  await enqueueOrdinanceGeneration({ address, municipalityLabel, searchedAt });
  void processOrdinanceQueue(1);

  return {
    data: null,
    meta: buildMeta({
      slug,
      municipalityLabel,
      status: "unregistered",
      displayStatus: "preparing",
      sourceType: "ai_draft",
      isPreparing: true,
    }),
  };
}

export async function listOrdinanceAdminRows() {
  const dynamicRecords = await listOrdinanceRecords();
  const dynamicBySlug = new Map(dynamicRecords.map((record) => [record.slug, record]));
  const rows = [];

  for (const staticOrdinance of STATIC_ORDINANCES) {
    const staticSlug = staticOrdinance.slug;
    const override = dynamicBySlug.get(staticSlug);
    rows.push({
      slug: staticSlug,
      municipalityLabel: staticOrdinance.municipalityLabel,
      status: "approved" as OrdinanceRecordStatus,
      sourceType: "static" as const,
      searchCount: override?.searchCount ?? 0,
      lastSearchedAt: override?.lastSearchedAt,
      reviewedAt: override?.reviewedAt ?? "2026-06-16",
      currentVersion: override?.currentVersion ?? 1,
      isStatic: true,
    });
    dynamicBySlug.delete(staticSlug);
  }

  for (const record of dynamicBySlug.values()) {
    rows.push({
      slug: record.slug,
      municipalityLabel: record.municipalityLabel,
      status: record.status,
      sourceType: record.sourceType,
      searchCount: record.searchCount,
      lastSearchedAt: record.lastSearchedAt,
      reviewedAt: record.reviewedAt,
      currentVersion: record.currentVersion,
      isStatic: false,
    });
  }

  return rows.sort((a, b) => b.searchCount - a.searchCount);
}

export function getStaticOrdinanceData(slug: string): MunicipalityOrdinanceData | null {
  return STATIC_ORDINANCES.find((item) => item.slug === slug) ?? null;
}

export { extractMunicipalityLabel };
