"use client";

import { useCallback, useEffect, useState } from "react";
import SectionHeader from "@/components/ui/SectionHeader";
import { useResultMetrics } from "@/components/result/ResultMetricsProvider";
import {
  formatGridLevelName,
  hasDetailedGridData,
  GRID_UNKNOWN_VALUE,
} from "@/lib/grid/display";
import { formatMw } from "@/lib/grid/evaluate";
import { getGridDataSourceNotice } from "@/lib/grid/dataSourceLabel";
import type { GridConnectionInfo, GridConnectionStatus } from "@/types/gridConnection";

const KEPCO_LINE_CAPACITY_URL = "https://online.kepco.co.kr/EWM092D00";

const STATUS_STYLES: Record<
  GridConnectionStatus,
  { badge: string; border: string; dot: string }
> = {
  high: {
    badge: "bg-emerald-50 text-emerald-800 border-emerald-200",
    border: "border-emerald-200",
    dot: "bg-emerald-500",
  },
  review: {
    badge: "bg-amber-50 text-amber-900 border-amber-200",
    border: "border-amber-200",
    dot: "bg-amber-500",
  },
  difficult: {
    badge: "bg-orange-50 text-orange-900 border-orange-200",
    border: "border-orange-200",
    dot: "bg-orange-500",
  },
  unknown: {
    badge: "bg-slate-100 text-slate-700 border-slate-200",
    border: "border-slate-200",
    dot: "bg-slate-400",
  },
};

interface GridConnectionSectionProps {
  initialGridInfo: GridConnectionInfo;
  address: string;
  jibunAddress: string;
  lat: number;
  lng: number;
  disclaimer: string;
}

function EquipmentNameCard({ label, name }: { label: string; name: string }) {
  return (
    <div className="flex min-h-[120px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/80 px-4 py-6 text-center shadow-sm sm:min-h-[140px] sm:px-6">
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <p className="mt-3 break-words text-xl font-bold leading-snug text-navy sm:text-2xl">{name}</p>
    </div>
  );
}

function CapacityRowsCard({
  title,
  substation,
  transformer,
  dl,
}: {
  title: string;
  substation: string;
  transformer: string;
  dl: string;
}) {
  const rows = [
    { label: "변전소", value: substation },
    { label: "변압기", value: transformer },
    { label: "D/L", value: dl },
  ];

  return (
    <div className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <p className="text-sm font-bold text-slate-800">{title}</p>
      <div className="mt-4 flex flex-1 flex-col justify-center space-y-3">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-3 text-sm">
            <span className="shrink-0 text-slate-500">{row.label}</span>
            <span className="text-right font-semibold text-slate-900">{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SingleValueCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="flex h-full min-h-[120px] flex-col justify-center rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <p className="text-sm font-bold text-slate-800">{title}</p>
      <p className="mt-3 text-xl font-bold text-navy sm:text-2xl">{value}</p>
    </div>
  );
}

function ContactCard({
  title,
  primary,
  secondary,
}: {
  title: string;
  primary: string;
  secondary?: string;
}) {
  return (
    <div className="flex h-full min-h-[120px] flex-col rounded-xl border border-slate-200 bg-slate-50/60 p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      <p className="mt-3 flex-1 text-base font-bold leading-snug text-slate-900">{primary}</p>
      <p className="mt-2 text-sm text-slate-700">{secondary ?? "담당 문의"}</p>
    </div>
  );
}

export default function GridConnectionSection({
  initialGridInfo,
  address,
  jibunAddress,
  lat,
  lng,
  disclaimer,
}: GridConnectionSectionProps) {
  const { metrics } = useResultMetrics();
  const [gridInfo, setGridInfo] = useState(initialGridInfo);
  const [selectedPoleId, setSelectedPoleId] = useState(initialGridInfo.selectedPoleId ?? "");
  const [loading, setLoading] = useState(false);

  const hasDetails = hasDetailedGridData(gridInfo);

  const fetchGrid = useCallback(
    async (poleId?: string) => {
      setLoading(true);
      try {
        const res = await fetch("/api/grid/lookup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lat,
            lng,
            address,
            jibunAddress,
            capacityKw: metrics.capacityKw,
            poleId: poleId || undefined,
          }),
        });
        if (!res.ok) return;
        const data = (await res.json()) as { gridInfo: GridConnectionInfo };
        setGridInfo(data.gridInfo);
        setSelectedPoleId(data.gridInfo.selectedPoleId ?? "");
      } catch {
        /* keep previous */
      } finally {
        setLoading(false);
      }
    },
    [address, jibunAddress, lat, lng, metrics.capacityKw],
  );

  useEffect(() => {
    if (Math.abs(metrics.capacityKw - initialGridInfo.expectedCapacityMw * 1000) > 0.05) {
      void fetchGrid(selectedPoleId || undefined);
    }
  }, [metrics.capacityKw, fetchGrid, selectedPoleId, initialGridInfo.expectedCapacityMw]);

  const styles = STATUS_STYLES[gridInfo.status];
  const fmtCum = (mw: number | null) => formatMw(mw);
  const fmtRem = (mw: number | null) => formatMw(mw);
  const fmtName = (name: string) => formatGridLevelName(name, hasDetails);

  return (
    <section id="grid" className="scroll-mt-24">
      <SectionHeader
        title="한전 계통 연계 검토"
        description="변전소·배전선로·잔여용량 기준 1차 계통 검토 결과입니다."
      />

      <div className="card-premium overflow-hidden">
        {/* 요약 카드 */}
        <div className={`border-b px-5 py-4 ${styles.border} bg-white`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-slate-500">계통 연계 상태</p>
              <div className="mt-1 flex items-center gap-2">
                <span className={`inline-flex h-2.5 w-2.5 rounded-full ${styles.dot}`} />
                <span
                  className={`inline-flex rounded-full border px-3 py-1 text-sm font-semibold ${styles.badge}`}
                >
                  {gridInfo.statusLabel}
                </span>
                {loading && <span className="text-xs text-slate-400">재계산 중…</span>}
              </div>
            </div>
            <div className="text-right text-sm">
              <p className="mt-1 text-xs text-slate-500">
                기준 위치: {gridInfo.referenceLocation}
              </p>
              {hasDetails && (
                <p className="text-xs text-slate-400">
                  데이터 기준일: {gridInfo.dataAsOfDate ?? GRID_UNKNOWN_VALUE}
                </p>
              )}
              <p className="mt-2 text-xs font-medium leading-relaxed text-slate-600">
                {gridInfo.dataSourceLabel}
              </p>
            </div>
          </div>
        </div>

        {/* 기준 전신주 */}
        {gridInfo.poles.length > 0 && (
          <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-7 sm:px-6 sm:py-8">
            <label
              htmlFor="grid-pole-select"
              className="block text-sm font-semibold text-slate-700"
            >
              기준 전신주
            </label>
            <select
              id="grid-pole-select"
              value={selectedPoleId}
              onChange={(e) => {
                setSelectedPoleId(e.target.value);
                void fetchGrid(e.target.value);
              }}
              className="mt-4 w-full max-w-2xl rounded-xl border border-slate-300 bg-white px-4 py-3.5 text-base font-semibold text-slate-900 shadow-sm sm:py-4"
            >
              {gridInfo.poles.map((pole) => (
                <option key={pole.poleId} value={pole.poleId}>
                  {pole.label || pole.poleId}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* 데이터 있음 — 설비명 + 용량 카드 */}
        {hasDetails && (
          <div className="space-y-5 px-5 py-6 sm:space-y-6 sm:px-6 sm:py-7">
            <div className="grid gap-4 sm:grid-cols-3">
              <EquipmentNameCard label="변전소" name={fmtName(gridInfo.substation.name)} />
              <EquipmentNameCard
                label="변압기 (MTR)"
                name={fmtName(gridInfo.transformer.name)}
              />
              <EquipmentNameCard
                label="배전선로 (D/L)"
                name={fmtName(gridInfo.distributionLine.name)}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <CapacityRowsCard
                title="누적연계용량"
                substation={fmtCum(gridInfo.substation.cumulativeMw)}
                transformer={fmtCum(gridInfo.transformer.cumulativeMw)}
                dl={fmtCum(gridInfo.distributionLine.cumulativeMw)}
              />
              <CapacityRowsCard
                title="잔여용량"
                substation={fmtRem(gridInfo.substation.remainingMw)}
                transformer={fmtRem(gridInfo.transformer.remainingMw)}
                dl={fmtRem(gridInfo.distributionLine.remainingMw)}
              />
              <SingleValueCard
                title="예상접속용량"
                value={gridInfo.expectedCapacityDisplay}
              />
              <SingleValueCard title="용량여유" value={gridInfo.capacityMarginDisplay} />
            </div>

            <p className="text-sm leading-relaxed text-slate-600">{gridInfo.reviewResult}</p>
          </div>
        )}

        {/* 데이터 없음 */}
        {!hasDetails && (
          <div className="border-b border-slate-100 px-5 py-8 sm:px-6 sm:py-10">
            <p className="text-base leading-relaxed text-slate-700">
              해당 위치의 계통 공개 데이터가 아직 확보되지 않았습니다.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              아래 <strong className="font-semibold text-slate-800">선로용량 확인하기</strong>{" "}
              버튼을 통해 한전 공개 시스템에서 확인 가능합니다.
            </p>
            <div className="mt-6">
              <a
                href={KEPCO_LINE_CAPACITY_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-11 items-center rounded-lg bg-navy px-5 text-sm font-semibold text-white transition-colors hover:bg-navy/90"
              >
                선로용량 확인하기
              </a>
            </div>
          </div>
        )}

        {/* 한전 연락처 */}
        <div className="border-t border-slate-100 px-5 py-6 sm:px-6 sm:py-7">
          <div className="grid gap-4 sm:grid-cols-3">
            <ContactCard
              title="관할 한전 지사"
              primary={gridInfo.contacts.kepcoBranch}
              secondary={gridInfo.contacts.branchPhone}
            />
            <ContactCard
              title="전력공급부"
              primary={gridInfo.contacts.supplyDepartment}
              secondary={gridInfo.contacts.supplyPhone}
            />
            <ContactCard
              title="계통운영기술부"
              primary={gridInfo.contacts.operationsDepartment}
              secondary={gridInfo.contacts.operationsPhone}
            />
          </div>
          {hasDetails && (
            <div className="mt-6">
              <a
                href={KEPCO_LINE_CAPACITY_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-11 items-center rounded-lg bg-navy px-5 text-sm font-semibold text-white transition-colors hover:bg-navy/90"
              >
                선로용량 확인하기
              </a>
            </div>
          )}
        </div>

        <div className="border-t border-amber-200 bg-amber-50 px-5 py-3">
          <p className="text-xs leading-relaxed text-amber-900 sm:text-sm">⚠ {disclaimer}</p>
          {getGridDataSourceNotice(gridInfo.dataSource) && (
            <p className="mt-1 text-xs leading-relaxed text-amber-900 sm:text-sm">
              ⚠ {getGridDataSourceNotice(gridInfo.dataSource)}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
