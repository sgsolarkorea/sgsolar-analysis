"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { DEFAULT_ADDRESS } from "@/data/sampleData";
import type { AddressSuggestion, AddressSuggestionsResponse } from "@/types/address";

type SuggestionStatus = "idle" | "loading" | "ready" | "empty";

const DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 2;

function AddressBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex shrink-0 rounded px-1.5 py-0.5 text-[11px] font-semibold leading-none text-white bg-navy">
      {label}
    </span>
  );
}

function SuggestionItem({
  item,
  onSelect,
}: {
  item: AddressSuggestion;
  onSelect: (item: AddressSuggestion) => void;
}) {
  return (
    <button
      type="button"
      role="option"
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => onSelect(item)}
      className="w-full px-4 py-3 text-left transition-colors hover:bg-slate-50 focus:bg-slate-50 focus:outline-none"
    >
      <div className="flex items-start gap-2">
        <AddressBadge label="지번" />
        <span className="text-sm leading-snug text-slate-900">{item.jibunAddress}</span>
      </div>
      <div className="mt-2 flex items-start gap-2">
        <AddressBadge label="도로명" />
        {item.roadAddress ? (
          <span className="text-sm leading-snug text-slate-700">{item.roadAddress}</span>
        ) : (
          <span className="text-sm leading-snug text-slate-400">도로명 주소가 존재하지 않습니다.</span>
        )}
      </div>
    </button>
  );
}

export default function AddressSearchForm() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [address, setAddress] = useState("");
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [status, setStatus] = useState<SuggestionStatus>("idle");
  const [isOpen, setIsOpen] = useState(false);

  const navigateToResult = useCallback(
    (value: string) => {
      const query = encodeURIComponent(value.trim() || DEFAULT_ADDRESS);
      router.push(`/analyzing?address=${query}`);
    },
    [router],
  );

  const selectSuggestion = useCallback(
    (item: AddressSuggestion) => {
      setAddress(item.selectedAddress);
      setIsOpen(false);
      navigateToResult(item.selectedAddress);
    },
    [navigateToResult],
  );

  useEffect(() => {
    const trimmed = address.trim();

    if (trimmed.length < MIN_QUERY_LENGTH) {
      setSuggestions([]);
      setStatus("idle");
      setIsOpen(false);
      return;
    }

    setStatus("loading");
    setIsOpen(true);

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/address/suggestions?q=${encodeURIComponent(trimmed)}`,
          { signal: controller.signal },
        );
        const data = (await res.json()) as AddressSuggestionsResponse;
        const next = data.suggestions ?? [];

        if (next.length > 0) {
          setSuggestions(next);
          setStatus("ready");
          setIsOpen(true);
        } else {
          setSuggestions([]);
          setStatus("empty");
          setIsOpen(true);
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setSuggestions([]);
        setStatus("empty");
        setIsOpen(true);
      }
    }, DEBOUNCE_MS);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [address]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isOpen && suggestions.length > 0) {
      selectSuggestion(suggestions[0]);
      return;
    }
    navigateToResult(address);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setIsOpen(false);
      return;
    }

    if (e.key === "Enter" && isOpen && suggestions.length > 0) {
      e.preventDefault();
      selectSuggestion(suggestions[0]);
    }
  }

  const showDropdown = isOpen && address.trim().length >= MIN_QUERY_LENGTH;

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-[840px]">
      <div ref={containerRef} className="relative">
        <div className="flex w-full flex-col overflow-hidden rounded-[14px] border border-slate-200/90 bg-white shadow-[0_12px_36px_rgba(0,0,0,0.16)] sm:flex-row sm:items-stretch">
          <div className="relative min-w-0 flex-1">
            <label htmlFor="home-address-search" className="sr-only">
              설치 희망 주소
            </label>
            <svg
              className="pointer-events-none absolute left-4 top-1/2 z-10 h-[22px] w-[22px] -translate-y-1/2 text-slate-500 sm:left-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <input
              id="home-address-search"
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => {
                if (address.trim().length >= MIN_QUERY_LENGTH) setIsOpen(true);
              }}
              placeholder="도로명 또는 지번 주소를 입력하세요"
              autoComplete="off"
              aria-autocomplete="list"
              aria-expanded={showDropdown}
              aria-controls="address-suggestions"
              className="h-[64px] w-full border-0 bg-transparent pl-12 pr-4 text-base text-foreground outline-none placeholder:text-slate-500 focus:ring-2 focus:ring-inset focus:ring-sky-500/35 sm:h-[66px] sm:pl-14 sm:text-[16px]"
            />
          </div>

          <button
            type="submit"
            className="inline-flex h-[64px] w-full shrink-0 items-center justify-center gap-2 bg-[#2563eb] px-6 text-base font-extrabold text-white transition hover:-translate-y-px hover:bg-[#1d4ed8] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white active:bg-[#1e40af] sm:h-[66px] sm:w-[210px]"
          >
            입지검토 시작
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
        </div>

        {showDropdown && (
          <div
            id="address-suggestions"
            role="listbox"
            className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 max-h-80 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl"
          >
            {status === "loading" && (
              <p className="px-4 py-3 text-sm text-slate-500">주소 검색 중...</p>
            )}

            {status === "empty" && (
              <p className="px-4 py-3 text-sm text-slate-500">검색 결과가 없습니다.</p>
            )}

            {status === "ready" &&
              suggestions.map((item) => (
                <div key={item.id} className="border-b border-slate-100 last:border-b-0">
                  <SuggestionItem item={item} onSelect={selectSuggestion} />
                </div>
              ))}
          </div>
        )}
      </div>

      <p className="mt-3 text-sm leading-relaxed text-slate-300 sm:mt-3">
        주소 입력만으로 1차 분석을 시작합니다. 회원가입 없이 확인할 수 있습니다.
      </p>
      <p className="mt-1.5 text-xs text-slate-400 sm:text-sm">예시: {DEFAULT_ADDRESS}</p>
    </form>
  );
}
