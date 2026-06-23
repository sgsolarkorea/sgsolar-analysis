import type { Page } from "puppeteer-core";
import { getPdfDocumentOrigin } from "@/lib/pdf/html/documentOrigin";
import { htmlText } from "@/lib/pdf/html/escape";

export interface MapCaptureResult {
  bytes: Uint8Array | null;
  status: string;
}

function buildCaptureHtml(
  jsKey: string,
  lat: number,
  lng: number,
  width: number,
  height: number,
  level: number,
): string {
  return `<!DOCTYPE html>
<html lang="ko"><head><meta charset="utf-8" /></head>
<body style="margin:0;padding:0;background:#eef3f8">
  <div id="map" style="width:${width}px;height:${height}px;overflow:hidden"></div>
  <script src="https://dapi.kakao.com/v2/maps/sdk.js?appkey=${htmlText(jsKey)}"></script>
  <script>
  (function () {
    var lat = ${lat};
    var lng = ${lng};
    var level = ${level};
    var el = document.getElementById("map");

    function mapReady() {
      var img = el.querySelector("img");
      return img && img.complete && img.naturalWidth > 0;
    }

    function render(typeId, label, next) {
      el.innerHTML = "";
      var center = new kakao.maps.LatLng(lat, lng);
      var opts = { center: center, level: level, marker: { position: center } };
      if (typeId) opts.mapTypeId = typeId;
      try {
        new kakao.maps.StaticMap(el, opts);
      } catch (e) {
        if (next) next();
        else window.__MAP_CAPTURE_STATUS__ = "staticmap-error";
        return;
      }
      setTimeout(function () {
        if (mapReady()) window.__MAP_CAPTURE_STATUS__ = label;
        else if (next) next();
        else window.__MAP_CAPTURE_STATUS__ = "image-empty";
      }, 2200);
    }

    function boot(retry) {
      if (!window.kakao || !window.kakao.maps) {
        if (retry < 50) return setTimeout(function () { boot(retry + 1); }, 150);
        window.__MAP_CAPTURE_STATUS__ = "sdk-timeout";
        return;
      }
      kakao.maps.load(function () {
        render(kakao.maps.MapTypeId.HYBRID, "hybrid", function () {
          render(kakao.maps.MapTypeId.ROADMAP, "roadmap", null);
        });
      });
    }

    boot(0);
  })();
  </script>
</body></html>`;
}

export async function captureKakaoStaticMapOnPage(
  page: Page,
  lat: number,
  lng: number,
  width: number,
  height: number,
  level: number,
): Promise<MapCaptureResult> {
  const jsKey = process.env.NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY?.trim();
  if (!jsKey) {
    console.warn("[PDF map] NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY not configured");
    return { bytes: null, status: "no-js-key" };
  }

  await page.setViewport({ width, height, deviceScaleFactor: 2 });

  page.on("pageerror", (error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.warn("[PDF map] page error:", message);
  });

  const html = buildCaptureHtml(jsKey, lat, lng, width, height, level);
  await page.setContent(html, {
    waitUntil: "domcontentloaded",
    timeout: 30_000,
    url: getPdfDocumentOrigin(),
  } as Parameters<typeof page.setContent>[1]);

  try {
    await page.waitForFunction(
      () => {
        const status = (window as Window & { __MAP_CAPTURE_STATUS__?: string }).__MAP_CAPTURE_STATUS__;
        return status === "hybrid" || status === "roadmap" || status === "image-empty" || status === "staticmap-error" || status === "sdk-timeout";
      },
      { timeout: 22_000, polling: 200 },
    );
  } catch {
    console.warn("[PDF map] capture wait timed out");
  }

  const status =
    (await page.evaluate(
      () => (window as Window & { __MAP_CAPTURE_STATUS__?: string }).__MAP_CAPTURE_STATUS__ ?? "unknown",
    )) ?? "unknown";

  const ready = await page.evaluate(() => {
    const img = document.querySelector("#map img") as HTMLImageElement | null;
    return Boolean(img && img.naturalWidth > 0);
  });

  if (!ready || status === "sdk-timeout" || status === "image-empty" || status === "staticmap-error") {
    console.warn(`[PDF map] capture failed: status=${status} ready=${ready}`);
    return { bytes: null, status };
  }

  const mapEl = await page.$("#map");
  if (!mapEl) return { bytes: null, status: "no-element" };

  const screenshot = await mapEl.screenshot({ type: "png" });
  console.info(`[PDF map] capture succeeded: status=${status} bytes=${screenshot.byteLength}`);
  return { bytes: new Uint8Array(screenshot), status };
}
