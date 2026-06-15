const KAKAO_SDK_ID = "kakao-map-sdk";

export type KakaoMapLoadError =
  | "missing_key"
  | "script_error"
  | "domain_mismatch"
  | "init_error";

let loadPromise: Promise<void> | null = null;

function waitForKakaoObject(maxAttempts = 30, intervalMs = 100): Promise<void> {
  return new Promise((resolve, reject) => {
    let attempts = 0;

    const check = () => {
      if (window.kakao?.maps) {
        resolve();
        return;
      }

      attempts += 1;
      if (attempts >= maxAttempts) {
        reject(new Error("domain_mismatch"));
        return;
      }

      setTimeout(check, intervalMs);
    };

    check();
  });
}

/** 카카오 지도 JavaScript SDK 로드 (클라이언트 전용) */
export function loadKakaoMapSdk(appKey: string): Promise<void> {
  if (!appKey) {
    return Promise.reject(new Error("missing_key"));
  }

  if (window.kakao?.maps) {
    return Promise.resolve();
  }

  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = new Promise((resolve, reject) => {
    const handleReady = () => {
      waitForKakaoObject()
        .then(resolve)
        .catch((error) => {
          loadPromise = null;
          reject(error);
        });
    };

    const existing = document.getElementById(KAKAO_SDK_ID) as HTMLScriptElement | null;
    if (existing && !window.kakao?.maps) {
      existing.remove();
    }

    const scriptEl = document.getElementById(KAKAO_SDK_ID) as HTMLScriptElement | null;
    if (scriptEl) {
      if (window.kakao?.maps) {
        resolve();
        return;
      }
      scriptEl.addEventListener("load", handleReady, { once: true });
      scriptEl.addEventListener(
        "error",
        () => {
          loadPromise = null;
          reject(new Error("script_error"));
        },
        { once: true },
      );
      return;
    }

    const script = document.createElement("script");
    script.id = KAKAO_SDK_ID;
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}&autoload=false`;
    script.async = true;
    script.onload = handleReady;
    script.onerror = async () => {
      loadPromise = null;
      try {
        const res = await fetch(script.src);
        const text = await res.text();
        if (text.includes("domain mismatched") || text.includes("AccessDeniedError")) {
          reject(new Error("domain_mismatch"));
          return;
        }
      } catch {
        // ignore fetch failure
      }
      reject(new Error("script_error"));
    };
    document.head.appendChild(script);
  });

  return loadPromise;
}

export function getKakaoMapErrorMessage(error: KakaoMapLoadError): string {
  switch (error) {
    case "missing_key":
      return "카카오 JavaScript 키가 설정되지 않았습니다. (.env.local → NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY)";
    case "domain_mismatch":
      return "카카오 지도 도메인이 등록되지 않았습니다.";
    case "script_error":
      return "카카오 지도 SDK 스크립트를 불러오지 못했습니다.";
    case "init_error":
      return "카카오 지도 초기화 중 오류가 발생했습니다.";
    default:
      return "카카오 지도를 불러오지 못했습니다.";
  }
}

export function getKakaoMapErrorDetail(error: KakaoMapLoadError): string | undefined {
  if (error === "domain_mismatch") {
    return "카카오 Developers → 내 애플리케이션 → 플랫폼 → Web → http://localhost:3000 을 등록한 뒤 dev 서버를 재시작해주세요.";
  }
  return undefined;
}

export function parseKakaoMapLoadError(error: unknown): KakaoMapLoadError {
  if (error instanceof Error) {
    if (error.message === "missing_key") return "missing_key";
    if (error.message === "domain_mismatch") return "domain_mismatch";
    if (error.message === "script_error") return "script_error";
  }
  return "init_error";
}
