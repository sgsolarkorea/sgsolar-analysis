"use client";

import { useCallback, useEffect, useState } from "react";
import SectionHeader from "@/components/ui/SectionHeader";
import { useResultMetrics } from "@/components/result/ResultMetricsProvider";
import { formatMw } from "@/lib/grid/evaluate";
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

function MetricBox({
  title,
  substation,
  transformer,
  dl,
  mode,
}: {
  title: string;
  substation: string;
  transformer: string;
  dl: string;
  mode: "name" | "cumulative" | "remaining";
}) {
  const rows =
    mode === "name"
      ? [
          { label: "변전소", value: substation },
          { label: "변압기", value: transformer },
          { label: "D/L", value: dl },
        ]
      : mode === "cumulative"
        ? [
            { label: "변전소", value: substation },
            { label: "변압기", value: transformer },
            { label: "D/L", value: dl },
          ]
        : [
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
                {loading && (
                  <span className="text-xs text-slate-400">재계산 중…</span>
                )}
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
                데이터 기준일: {gridInfo.dataAsOfDate ?? "미확보"}
              </p>
            </div>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-slate-600">{disclaimer}</p>
        </div>

        {/* 전신주 선택 */}
        {gridInfo.poles.length > 0 && (
          <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-4">
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
              className="mt-2 w-full max-w-md rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-900"
            >
              {gridInfo.poles.map((pole) => (
                <option key={pole.poleId} value={pole.poleId}>
                  {pole.label || pole.poleId}
                </option>
              ))}
            </select>
            <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
              <p>
                <span className="text-slate-500">변전소: </span>
                <span className="font-semibold">{gridInfo.substation.name}</span>
              </p>
              <p>
                <span className="text-slate-500">변압기: </span>
                <span className="font-semibold">{gridInfo.transformer.name}</span>
              </p>
              <p>
                <span className="text-slate-500">배전선로: </span>
                <span className="font-semibold">{gridInfo.distributionLine.name}</span>
              </p>
            </div>
          </div>
        )}

        {/* 3개 박스 */}
        <div className="grid gap-4 px-5 py-5 sm:grid-cols-3">
          <MetricBox
            title="① 이름"
            mode="name"
            substation={gridInfo.substation.name}
            transformer={gridInfo.transformer.name}
            dl={gridInfo.distributionLine.name}
          />
          <MetricBox
            title="② 누적연계용량"
            mode="cumulative"
            substation={fmtCum(gridInfo.substation.cumulativeMw)}
            transformer={fmtCum(gridInfo.transformer.cumulativeMw)}
            dl={fmtCum(gridInfo.distributionLine.cumulativeMw)}
          />
          <MetricBox
            title="③ 여유용량"
            mode="remaining"
            substation={fmtRem(gridInfo.substation.remainingMw)}
            transformer={fmtRem(gridInfo.transformer.remainingMw)}
            dl={fmtRem(gridInfo.distributionLine.remainingMw)}
          />
        </div>

        {/* 추가 정보 */}
        <div className="border-t border-slate-100 bg-navy-light/30 px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">추가 정보</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <CapacityCell label="잔여용량 (D/L 기준)" value={gridInfo.remainingCapacityDisplay} />
            <CapacityCell label="예상 접속용량" value={gridInfo.expectedCapacityDisplay} />
            <CapacityCell label="용량 여유 (+/−)" value={gridInfo.capacityMarginDisplay} />
            <CapacityCell label="검토결과" value={gridInfo.reviewResult} />
          </div>
        </div>

        {/* 한전 연락처 */}
        <div className="border-t border-slate-100 px-5 py-5">
          <div className="grid gap-4 lg:grid-cols-3">
            <div>
              <p className="text-xs text-slate-500">관할 한전 지사</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {gridInfo.contacts.kepcoBranch}
              </p>
              <p className="mt-1 text-sm text-slate-700">{gridInfo.contacts.branchPhone}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">전력공급 / 계통검토</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {gridInfo.contacts.supplyDepartment}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">{gridInfo.contacts.operationsDepartment}</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {gridInfo.contacts.operationsPhone}
              </p>
            </div>
          </div>
          <div className="mt-4">
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
          <p className="text-xs leading-relaxed text-amber-900 sm:text-sm">
            ⚠ {disclaimer}
          </p>
          {gridInfo.dataSource === "none" && (
            <p className="mt-1 text-xs leading-relaxed text-amber-900 sm:text-sm">
              ⚠ 해당 지역 공개 계통 데이터가 없어 한전 확인이 필요합니다. 관리자 페이지에서
              수동 데이터를 등록하면 검토 결과가 표시됩니다.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
