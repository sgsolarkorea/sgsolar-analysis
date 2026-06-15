import { NextResponse } from "next/server";
import { searchAddressSuggestions } from "@/lib/api/kakao";
import {
  KakaoAddressNotFoundError,
  KakaoApiKeyMissingError,
  KakaoNetworkError,
} from "@/lib/api/kakaoErrors";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";

  if (query.length < 2) {
    return NextResponse.json({ suggestions: [] });
  }

  try {
    const suggestions = await searchAddressSuggestions(query);
    return NextResponse.json({ suggestions });
  } catch (error) {
    if (error instanceof KakaoApiKeyMissingError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    if (error instanceof KakaoAddressNotFoundError || error instanceof KakaoNetworkError) {
      return NextResponse.json({ suggestions: [] });
    }
    console.error("[AddressSuggestions] Unexpected error:", error);
    return NextResponse.json({ suggestions: [] });
  }
}
