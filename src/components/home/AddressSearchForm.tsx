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
    <form onSubmit={handleSubmit} className="w-full">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div ref={containerRef} className="relative flex-1">
          <svg
            className="absolute left-4 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-muted"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <input
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
            className="h-12 w-full rounded-xl border border-border bg-white pl-12 pr-4 text-base text-foreground outline-none focus:border-navy focus:ring-2 focus:ring-navy/10 sm:h-14"
          />

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
        <button type="submit" className="btn-primary h-12 shrink-0 px-8 text-base sm:h-14">
          입지검토 시작
        </button>
      </div>
      <p className="mt-3 text-sm text-slate-400">예시: {DEFAULT_ADDRESS}</p>
    </form>
  );
}
