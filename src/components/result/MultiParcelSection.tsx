"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useResultMetrics } from "@/components/result/ResultMetricsProvider";
import SectionHeader from "@/components/ui/SectionHeader";
import { ADJACENT_PARCEL_MVP_LIMIT } from "@/lib/parcels/constants";
import { formatParcelShortLabel } from "@/lib/parcels/format";
import type { AdjacentParcelCandidate } from "@/types/parcelReview";
import type { AddressSuggestion } from "@/types/address";
import type { ParcelItem } from "@/types/parcelReview";

function candidateToParcel(candidate: AdjacentParcelCandidate): ParcelItem {
  return {
    id: candidate.pnu,
    address: candidate.address,
    jibunAddress: candidate.jibunAddress,
    pnu: candidate.pnu,
    lat: candidate.lat,
    lng: candidate.lng,
    areaSqm: candidate.areaSqm,
    areaLabel: candidate.areaLabel,
    landCategory: candidate.landCategory,
    zoning: candidate.zoning,
    isPrimary: false,
  };
}

export default function MultiParcelSection() {
  const {
    multiParcelEnabled,
    installType,
    parcels,
    parcelSummary,
    addParcel,
    removeParcel,
    addParcelsFromCandidates,
    primaryParcel,
  } = useResultMetrics();

  const parcelsRef = useRef(parcels);
  parcelsRef.current = parcels;

  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adjacentCandidates, setAdjacentCandidates] = useState<AdjacentParcelCandidate[]>([]);
  const [selectedAdjacent, setSelectedAdjacent] = useState<Set<string>>(new Set());
  const [loadingAdjacent, setLoadingAdjacent] = useState(false);
  const [showAdjacentCard, setShowAdjacentCard] = useState(false);
  const adjacentLoadedRef = useRef(false);

  const showSection = multiParcelEnabled && installType === "토지형";

  useEffect(() => {
    if (!showSection) return;

    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/address/suggestions?q=${encodeURIComponent(trimmed)}`);
        const data = (await res.json()) as { suggestions?: AddressSuggestion[] };
        setSuggestions(data.suggestions ?? []);
      } catch {
        setSuggestions([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, showSection]);

  const loadAdjacent = useCallback(async (force = false) => {
    if (!force && adjacentLoadedRef.current) return;
    setLoadingAdjacent(true);
    try {
      const params = new URLSearchParams({
        lat: String(primaryParcel.lat),
        lng: String(primaryParcel.lng),
        existingPnus: parcelsRef.current.map((p) => p.pnu).filter(Boolean).join(","),
      });
      if (primaryParcel.pnu) params.set("excludePnu", primaryParcel.pnu);

      const res = await fetch(`/api/parcels/adjacent?${params.toString()}`);
      const data = (await res.json()) as { candidates?: AdjacentParcelCandidate[] };
      const candidates = (data.candidates ?? []).slice(0, ADJACENT_PARCEL_MVP_LIMIT);
      setAdjacentCandidates(candidates);
      setSelectedAdjacent(new Set(candidates.map((item) => item.pnu)));
      setShowAdjacentCard(candidates.length > 0);
      adjacentLoadedRef.current = true;
    } catch {
      setAdjacentCandidates([]);
      setShowAdjacentCard(false);
    } finally {
      setLoadingAdjacent(false);
    }
  }, [primaryParcel]);

  useEffect(() => {
    if (showSection && !adjacentLoadedRef.current) {
      void loadAdjacent();
    }
  }, [showSection, loadAdjacent]);

  if (!showSection) return null;

  async function handleAddAddress(address: string) {
    setError(null);
    setIsAdding(true);
    try {
      const res = await fetch("/api/parcels/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      });
      const data = (await res.json()) as { parcel?: ParcelItem; error?: string };
      if (!res.ok || !data.parcel) {
        throw new Error(data.error ?? "필지 조회에 실패했습니다. 주소를 다시 확인해 주세요.");
      }

      if (
        parcelsRef.current.some((item) => item.pnu && item.pnu === data.parcel!.pnu)
      ) {
        setError("동일한 필지(PNU)가 이미 추가되어 있습니다.");
        return;
      }

      const added = addParcel(data.parcel);
      if (!added) {
        setError("이미 추가된 필지입니다.");
        return;
      }

      setQuery("");
      setSuggestions([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "필지 추가에 실패했습니다.");
    } finally {
      setIsAdding(false);
    }
  }

  function handleAddSelectedAdjacent() {
    const selected = adjacentCandidates
      .filter((item) => selectedAdjacent.has(item.pnu))
      .map(candidateToParcel);
    const count = addParcelsFromCandidates(selected);
    if (count > 0) {
      setShowAdjacentCard(false);
      adjacentLoadedRef.current = false;
      void loadAdjacent(true);
    } else {
      setError("선택한 필지가 이미 추가되어 있거나 추가할 수 없습니다.");
    }
  }

  function toggleAdjacent(pnu: string) {
    setSelectedAdjacent((prev) => {
      const next = new Set(prev);
      if (next.has(pnu)) next.delete(pnu);
      else next.add(pnu);
      return next;
    });
  }

  return (
    <section id="multi-parcel" className="scroll-mt-24">
      <SectionHeader
        title="다중 필지 검토"
        description="토지형 사업 검토를 위해 여러 필지를 묶어 총면적·용량·수익을 산정합니다."
      />

      <div className="card-premium p-5 sm:p-6">
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-100">
          {parcels.map((parcel) => (
            <li
              key={parcel.id}
              className="flex flex-col gap-2 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
            >
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-900">
                  {formatParcelShortLabel(parcel.jibunAddress)}
                  {parcel.isPrimary && (
                    <span className="ml-2 text-xs font-medium text-navy">대표</span>
                  )}
                </p>
                <p className="mt-0.5 break-words text-xs text-slate-500">{parcel.jibunAddress}</p>
              </div>
              <div className="flex shrink-0 items-center justify-between gap-3 sm:justify-end">
                <span className="text-sm font-bold text-navy">{parcel.areaLabel}</span>
                {!parcel.isPrimary && (
                  <button
                    type="button"
                    onClick={() => removeParcel(parcel.id)}
                    className="rounded-md border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    삭제
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-4 grid gap-3 rounded-xl border border-navy/15 bg-navy-light/40 p-4 sm:grid-cols-3">
          <div>
            <p className="text-xs font-semibold text-slate-500">총 필지 수</p>
            <p className="mt-1 text-lg font-bold text-slate-900">{parcelSummary.parcelCount}필지</p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-xs font-semibold text-slate-500">총면적</p>
            <p className="mt-1 text-lg font-bold text-navy">{parcelSummary.totalAreaLabel}</p>
          </div>
        </div>

        <div className="mt-5">
          <label htmlFor="parcel-add-search" className="mb-1.5 block text-sm font-semibold text-slate-900">
            필지 추가
          </label>
          <div className="relative">
            <input
              id="parcel-add-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="추가할 필지 주소를 검색하세요 (예: 운봉리 113)"
              className="input-field"
            />
            {(isSearching || suggestions.length > 0) && query.trim().length >= 2 && (
              <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-slate-200 bg-white shadow-lg">
                {suggestions.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      disabled={isAdding}
                      onClick={() => handleAddAddress(item.selectedAddress)}
                      className="block w-full px-4 py-3 text-left text-sm hover:bg-slate-50 disabled:opacity-60"
                    >
                      <span className="font-medium text-slate-900">{item.jibunAddress}</span>
                      {item.roadAddress && (
                        <span className="mt-0.5 block text-xs text-slate-500">{item.roadAddress}</span>
                      )}
                    </button>
                  </li>
                ))}
                {!isSearching && suggestions.length === 0 && (
                  <li className="px-4 py-3 text-sm text-slate-500">검색 결과 없음</li>
                )}
              </ul>
            )}
          </div>
          {error && (
            <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
        </div>

        {showAdjacentCard && adjacentCandidates.length > 0 && (
          <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50/80 p-4">
            <p className="text-sm font-bold text-slate-900">
              인접 필지를 함께 검토하시겠습니까?
            </p>
            <p className="mt-1 text-xs text-slate-600">
              대표 필지 기준 반경 50m 내 필지 (최대 {ADJACENT_PARCEL_MVP_LIMIT}건)
            </p>
            <ul className="mt-3 space-y-2">
              {adjacentCandidates.map((item) => (
                <li key={item.pnu}>
                  <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-amber-100 bg-white px-3 py-2.5 sm:items-center">
                    <input
                      type="checkbox"
                      checked={selectedAdjacent.has(item.pnu)}
                      onChange={() => toggleAdjacent(item.pnu)}
                      className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 sm:mt-0"
                    />
                    <span className="text-sm font-semibold leading-snug text-slate-900">
                      {formatParcelShortLabel(item.jibunAddress)} {item.areaLabel}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleAddSelectedAdjacent}
                className="rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-navy/90"
              >
                선택 필지 추가
              </button>
              <button
                type="button"
                onClick={() => setShowAdjacentCard(false)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-white"
              >
                닫기
              </button>
            </div>
          </div>
        )}

        {loadingAdjacent && (
          <p className="mt-3 text-xs text-slate-500">인접 필지를 확인하는 중...</p>
        )}
      </div>
    </section>
  );
}
