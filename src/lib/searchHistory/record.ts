import type { ResolvedSiteReview } from "@/types/siteReview";
import { sendSearchHistoryNotification } from "@/lib/searchHistory/email";
import { saveSearchHistoryEntry } from "@/lib/searchHistory/storage";

/** 결과 페이지 진입 시 조회 이력 저장 + 담당자 알림 (페이지 렌더 차단 없음) */
export async function recordSearchHistory(
  data: ResolvedSiteReview,
  searchAddress: string,
): Promise<{ id: string; saved: boolean; emailSent: boolean }> {
  const result = await saveSearchHistoryEntry(data, searchAddress);
  const emailSent = await sendSearchHistoryNotification(result.entry);

  if (result.saved) {
    console.info(
      `[SearchHistory] Saved entry ${result.entry.id} via ${result.storage}, emailSent=${emailSent}`,
    );
  } else {
    console.warn(
      `[SearchHistory] Storage unavailable for entry ${result.entry.id}, emailSent=${emailSent}`,
    );
  }

  return { id: result.entry.id, saved: result.saved, emailSent };
}
