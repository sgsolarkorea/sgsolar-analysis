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

function CapacityCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
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
    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
      <p className="text-xs font-medium text-slate-500">{title}</p>
      <p className="mt-2 text-sm font-semibold leading-snug text-slate-900">{primary}</p>
      {secondary && (
        <p className="mt-1 text-sm text-slate-700">{secondary}</p>
      )}
    </div>
  );
}

function MetricBox({
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
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      <div className="mt-3 space-y-2">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-2 text-sm">
            <span className="text-slate-500">{row.label}</span>
            <span className="font-semibold text-slate-900">{row.value}</span>
          </div>
        ))}
      </div>
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
              <p className="text-slate-500">
                예상 접속용량{" "}
                <span className="font-bold text-navy">{gridInfo.expectedCapacityDisplay}</span>
              </p>
              <p className="mt-1 text-xs text-slate-500">
                기준 위치: {gridInfo.referenceLocation}
              </p>
              <p className="text-xs text-slate-400">
                데이터 기준일: {gridInfo.dataAsOfDate ?? GRID_UNKNOWN_VALUE}
              </p>
              <p className="mt-1 text-xs font-medium text-slate-600">
                {gridInfo.dataSourceLabel}
              </p>
            </div>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-slate-600">{disclaimer}</p>
        </div>

        {/* 전신주 선택 */}
        {gridInfo.poles.length > 0 && (
          <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-5">
            <label htmlFor="grid-pole-select" className="text-sm font-medium text-slate-700">
              기준 전신주
            </label>
            <select
              id="grid-pole-select"
              value={selectedPoleId}
              onChange={(e) => {
                setSelectedPoleId(e.target.value);
                void fetchGrid(e.target.value);
              }}
              className="mt-3 w-full max-w-lg rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-sm"
            >
              {gridInfo.poles.map((pole) => (
                <option key={pole.poleId} value={pole.poleId}>
                  {pole.label || pole.poleId}
                </option>
              ))}
            </select>
            {hasDetails && (
              <div className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
                <p>
                  <span className="text-slate-500">변전소: </span>
                  <span className="font-semibold">{fmtName(gridInfo.substation.name)}</span>
                </p>
                <p>
                  <span className="text-slate-500">변압기: </span>
                  <span className="font-semibold">{fmtName(gridInfo.transformer.name)}</span>
                </p>
                <p>
                  <span className="text-slate-500">배전선로: </span>
                  <span className="font-semibold">{fmtName(gridInfo.distributionLine.name)}</span>
                </p>
              </div>
            )}
          </div>
        )}

        {/* 데이터 없음 — 단순 안내 */}
        {!hasDetails && (
          <div className="border-b border-slate-100 px-5 py-6">
            <p className="text-sm leading-relaxed text-slate-600">
              해당 위치의 변전소·배전선로·잔여용량 공개 데이터가 아직 등록되지 않았습니다.
              아래 <strong className="font-semibold text-slate-800">선로용량 확인하기</strong>를
              통해 한전 공개 시스템에서 직접 확인하거나, 관리자 페이지에서 지역 데이터를
              등록해 주세요.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <CapacityCell label="잔여용량 (D/L 기준)" value={GRID_UNKNOWN_VALUE} />
              <CapacityCell label="용량 여유 (+/−)" value={GRID_UNKNOWN_VALUE} />
            </div>
          </div>
        )}

        {/* 3개 박스 — 데이터 있을 때만 */}
        {hasDetails && (
          <div className="grid gap-4 px-5 py-5 sm:grid-cols-3">
            <MetricBox
              title="① 이름"
              substation={fmtName(gridInfo.substation.name)}
              transformer={fmtName(gridInfo.transformer.name)}
              dl={fmtName(gridInfo.distributionLine.name)}
            />
            <MetricBox
              title="② 누적연계용량"
              substation={fmtCum(gridInfo.substation.cumulativeMw)}
              transformer={fmtCum(gridInfo.transformer.cumulativeMw)}
              dl={fmtCum(gridInfo.distributionLine.cumulativeMw)}
            />
            <MetricBox
              title="③ 여유용량"
              substation={fmtRem(gridInfo.substation.remainingMw)}
              transformer={fmtRem(gridInfo.transformer.remainingMw)}
              dl={fmtRem(gridInfo.distributionLine.remainingMw)}
            />
          </div>
        )}

        {/* 추가 정보 — 데이터 있을 때만 전체 */}
        {hasDetails && (
          <div className="border-t border-slate-100 bg-navy-light/30 px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              추가 정보
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <CapacityCell
                label="잔여용량 (D/L 기준)"
                value={gridInfo.remainingCapacityDisplay}
              />
              <CapacityCell label="예상 접속용량" value={gridInfo.expectedCapacityDisplay} />
              <CapacityCell label="용량 여유 (+/−)" value={gridInfo.capacityMarginDisplay} />
              <CapacityCell label="검토결과" value={gridInfo.reviewResult} />
            </div>
          </div>
        )}

        {/* 한전 연락처 — 카드형 */}
        <div className="border-t border-slate-100 px-5 py-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <ContactCard
              title="관할 한전 지사"
              primary={gridInfo.contacts.kepcoBranch}
              secondary={gridInfo.contacts.branchPhone}
            />
            <ContactCard
              title="전력공급부 / 태양광 계통검토"
              primary={gridInfo.contacts.supplyDepartment}
            />
            <ContactCard
              title={gridInfo.contacts.operationsDepartment}
              primary={gridInfo.contacts.operationsPhone}
            />
          </div>
          <div className="mt-5">
            <a
              href={KEPCO_LINE_CAPACITY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 items-center rounded-lg bg-navy px-4 text-sm font-semibold text-white transition-colors hover:bg-navy/90"
            >
              선로용량 확인하기
            </a>
          </div>
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
