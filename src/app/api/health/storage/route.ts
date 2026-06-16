import { NextResponse } from "next/server";
import { GRID_DATA_INDEX_KEY } from "@/lib/grid/storage";
import { ORDINANCE_INDEX_KEY } from "@/lib/ordinanceLearning/redisKeys";
import {
  getRedisClient,
  SEARCH_HISTORY_INDEX_KEY,
} from "@/lib/searchHistory/redis";

/** Production Redis 연결 상태 (민감정보 미포함) */
export async function GET() {
  const redis = getRedisClient();
  if (!redis) {
    return NextResponse.json({
      redis: { configured: false, connected: false },
      message: "KV_REST_API_URL / KV_REST_API_TOKEN not set",
    });
  }

  try {
    const ping = await redis.ping();
    const [searchHistoryCount, gridDataCount, ordinanceCount] = await Promise.all([
      redis.zcard(SEARCH_HISTORY_INDEX_KEY).catch(() => 0),
      redis.scard(GRID_DATA_INDEX_KEY).catch(() => 0),
      redis.scard(ORDINANCE_INDEX_KEY).catch(() => 0),
    ]);

    return NextResponse.json({
      redis: {
        configured: true,
        connected: ping === "PONG",
        ping,
      },
      counts: {
        searchHistory: searchHistoryCount,
        gridData: gridDataCount,
        ordinances: ordinanceCount,
      },
    });
  } catch (error) {
    console.warn("[Health/Storage] Redis ping failed:", error);
    return NextResponse.json({
      redis: { configured: true, connected: false },
      error: "Redis ping failed",
    });
  }
}
