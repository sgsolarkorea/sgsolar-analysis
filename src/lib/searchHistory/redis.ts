import { Redis } from "@upstash/redis";

let client: Redis | null | undefined;

export function getRedisClient(): Redis | null {
  if (client !== undefined) return client;

  const url =
    process.env.KV_REST_API_URL?.trim() ||
    process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token =
    process.env.KV_REST_API_TOKEN?.trim() ||
    process.env.UPSTASH_REDIS_REST_TOKEN?.trim();

  if (!url || !token) {
    client = null;
    return client;
  }

  client = new Redis({ url, token });
  return client;
}

export const SEARCH_HISTORY_INDEX_KEY = "search-history:index";
export const searchHistoryEntryKey = (id: string) => `search-history:entry:${id}`;
export const searchHistoryAddressKey = (normalizedAddress: string) =>
  `search-history:address:${normalizedAddress}`;
