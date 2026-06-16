import { getGridDataSourceLabel } from "@/lib/grid/dataSourceLabel";
import { normalizeGridContacts, resolveGridContacts } from "@/lib/grid/contacts";
import {
  buildReviewResult,
  evaluateGridConnectionStatus,
  formatCapacityMargin,
  formatMw,
  GRID_DISCLAIMER_TEXT,
  GRID_STATUS_LABELS,
  GRID_UNKNOWN_VALUE,
  pickBottleneckRemainingMw,
} from "@/lib/grid/evaluate";
import { fetchKepcoGridByLocation } from "@/lib/grid/kepcoApi";
import { buildPoleLabel, derivePoleCandidates } from "@/lib/grid/poleFromAddress";
import { listGridAdminRecords, matchGridAdminRecord } from "@/lib/grid/storage";
import type {
  GridConnectionInfo,
  GridLevelCapacity,
  GridPoleOption,
} from "@/types/gridConnection";

export interface ResolveGridInput {
  lat: number;
  lng: number;
  address: string;
  jibunAddress: string;
  capacityKw: number;
  pnu?: string;
  poleId?: string;
}

function emptyLevel(name: string = GRID_UNKNOWN_VALUE): GridLevelCapacity {
  return { name, cumulativeMw: null, remainingMw: null };
}

function buildFromPole(
  pole: GridPoleOption,
  input: ResolveGridInput,
  dataAsOfDate: string | null,
  dataSource: GridConnectionInfo["dataSource"],
  contacts: GridConnectionInfo["contacts"],
): GridConnectionInfo {
  const expectedMw = Math.round((input.capacityKw / 1000) * 1000) / 1000;
  const remainingMw = pickBottleneckRemainingMw(pole);
  const status = evaluateGridConnectionStatus(remainingMw, expectedMw);
  const margin = formatCapacityMargin(remainingMw, expectedMw);

  return {
    status,
    statusLabel: GRID_STATUS_LABELS[status],
    expectedCapacityMw: expectedMw,
    expectedCapacityDisplay: formatMw(expectedMw, "—"),
    referenceLocation: pole.referenceLocation || input.jibunAddress || input.address,
    dataAsOfDate,
    selectedPoleId: pole.poleId,
    poles: [pole],
    remainingCapacityMw: remainingMw,
    remainingCapacityDisplay: formatMw(remainingMw),
    capacityMarginMw: margin.mw,
    capacityMarginDisplay: margin.display,
    reviewResult: buildReviewResult(status, remainingMw, expectedMw),
    contacts,
    dataSource,
    dataSourceLabel: getGridDataSourceLabel(dataSource),
    substation: pole.substation,
    transformer: pole.transformer,
    distributionLine: pole.distributionLine,
  };
}

function buildUnknownState(
  input: ResolveGridInput,
  poles: GridPoleOption[],
  contacts: GridConnectionInfo["contacts"],
): GridConnectionInfo {
  const expectedMw = Math.round((input.capacityKw / 1000) * 1000) / 1000;
  const selected =
    poles.find((p) => p.poleId === input.poleId) ?? poles[0] ?? null;

  const substation = selected?.substation ?? emptyLevel();
  const transformer = selected?.transformer ?? emptyLevel();
  const distributionLine = selected?.distributionLine ?? emptyLevel();

  return {
    status: "unknown",
    statusLabel: GRID_STATUS_LABELS.unknown,
    expectedCapacityMw: expectedMw,
    expectedCapacityDisplay: formatMw(expectedMw, "—"),
    referenceLocation: selected?.referenceLocation ?? input.jibunAddress ?? input.address,
    dataAsOfDate: null,
    selectedPoleId: selected?.poleId ?? null,
    poles,
    remainingCapacityMw: null,
    remainingCapacityDisplay: GRID_UNKNOWN_VALUE,
    capacityMarginMw: null,
    capacityMarginDisplay: GRID_UNKNOWN_VALUE,
    reviewResult: buildReviewResult("unknown", null, expectedMw),
    contacts,
    dataSource: "none",
    dataSourceLabel: getGridDataSourceLabel("none"),
    substation,
    transformer,
    distributionLine,
  };
}

function selectPole(
  poles: GridPoleOption[],
  poleId: string | undefined,
  jibunAddress: string,
): GridPoleOption | null {
  if (!poles.length) return null;
  if (poleId) {
    return poles.find((p) => p.poleId === poleId) ?? poles[0];
  }
  const derived = derivePoleCandidates(jibunAddress);
  for (const candidate of derived) {
    const match = poles.find(
      (p) => p.poleId === candidate || p.poleId.startsWith(candidate.split("-")[0]),
    );
    if (match) return match;
  }
  return poles[0];
}

/** @deprecated GridConnectionInfo 사용 — 하위 호환 alias */
export type { GridConnectionInfo as GridInfo };

export async function resolveGridConnection(input: ResolveGridInput): Promise<GridConnectionInfo> {
  const contacts = resolveGridContacts(input.address, input.jibunAddress);

  const kepco = await fetchKepcoGridByLocation(input);
  if (kepco?.poles.length) {
    const pole = selectPole(kepco.poles, input.poleId, input.jibunAddress) ?? kepco.poles[0];
    return {
      ...buildFromPole(pole, input, kepco.dataAsOfDate, "kepco-api", contacts),
      poles: kepco.poles,
      contacts,
    };
  }

  const adminRecords = await listGridAdminRecords();
  const adminMatch = matchGridAdminRecord(adminRecords, input.address, input.jibunAddress);

  if (adminMatch?.poles.length) {
    const pole = selectPole(adminMatch.poles, input.poleId, input.jibunAddress)!;
    return {
      ...buildFromPole(pole, input, adminMatch.dataAsOfDate, "admin", adminMatch.contacts),
      poles: adminMatch.poles.map((p) => ({
        ...p,
        label: p.label || buildPoleLabel(p.poleId, p.referenceLocation),
      })),
      contacts: normalizeGridContacts(adminMatch.contacts),
    };
  }

  const derivedIds = derivePoleCandidates(input.jibunAddress);
  const placeholderPoles: GridPoleOption[] = derivedIds.map((poleId) => ({
    poleId,
    label: buildPoleLabel(poleId, input.jibunAddress),
    referenceLocation: input.jibunAddress || input.address,
    substation: emptyLevel(),
    transformer: emptyLevel(),
    distributionLine: emptyLevel(),
  }));

  return buildUnknownState(input, placeholderPoles, contacts);
}

export { GRID_DISCLAIMER_TEXT };
