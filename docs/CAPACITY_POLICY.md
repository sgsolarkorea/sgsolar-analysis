# SG SOLAR 용량·가배치 정책 (capacity-policy-v1)

릴리즈 태그: `capacity-policy-v1-building-4.45`

## 대표 용량 (UI · PDF · 상담접수)

| 구분 | 정책 |
|------|------|
| **건물형** | **A-only** — `roofUsableAreaSqm ÷ areaPerKw` → floor(모듈) → kW |
| **건물형 layout B** | diagnostics only (가배치 API·debug). 대표 용량·수익·상담에 **미반영** |
| **토지형** | 현재 analyze 단계는 A-only. **Phase 3**에서 `min(A,B)` 적용 예정 |

### areaPerKw

| 설치유형 | 값 (㎡/kW) | 설정 |
|----------|------------|------|
| 건물형 (roof/barn/factory/commercial) | **4.45** | `src/data/solarConfig.ts` |
| 토지형 (land) | **8.72** (기존 유지) | `src/data/solarConfig.ts` |

### 건물형 A 면적 기준

- `capacityAreaSqm` = **지붕 setback 후 usable polygon 합** (`roofUsableAreaSqm`)
- 건축면적(대장) fallback **사용하지 않음**
- 구현: `src/lib/solar/resolveSiteGeometry.ts`

### 모듈·용량 산식

```
rawCapacityKw = baseAreaSqm / areaPerKw
targetModuleCount = floor(rawCapacityKw / 0.64)
capacityKw = targetModuleCount × 0.64
```

구현: `src/lib/solar/capacityResolution.ts` → `resolveTargetCapacity`

## 가배치·setback 정책

| 항목 | 값 | 설정 |
|------|-----|------|
| 건물 roof edge setback | **0.5m** | `layoutPolicy.roofEdgeSetbackM` |
| 토지 parcel boundary setback | **3.0m** | `layoutPolicy.parcelBoundarySetbackM` |
| dual array set aisle | **2.4m** | `layoutPolicy.dualArraySetAisleM` |
| 건물 fitting (production B) | edge tolerance **0.1m** | `layoutPolicy.roofEdgeToleranceM` |

설정 파일: `src/data/moduleLayoutConfig.ts`

## 다중 필지 (토지형)

- **multi parcel union** 적용 — `resolveMultiParcelGeometry`, `/api/site-geometry/multi-parcel`
- 대표 용량: union 후 usable/면적 기준 A 계산
- 검증 주소 예: 통영 신전리 5필지 (1288-1 + 1320 + 1321 + 1287 + 1286)

## SSR 캐시

- `getCachedAnalyzeSolarSite` — 2분 `unstable_cache`
- salt: `roof-{areaPerKw}-usable-v1` — 정책 변경 시 자동 무효화
- 구현: `src/lib/api/analysis.ts`

## 상담접수 analysisContext

화면 `ResultMetricsProvider.consultationContext`와 동일 필드 저장:

- `installType`, `capacity`, `capacityKw`, `moduleCount`, `areaPerKw`
- `roofUsableAreaSqm` / `landUsableAreaSqm`
- `parcelCount`, `layoutMode` (가배치 로드 후)

## Debug / Probe (개발자 전용)

일반 사용자 UI에 노출 금지. URL 쿼리에서만:

- `?polygonDebug=1|raw|compare|roof`
- `?roofFittingProbe=1` (roof debug와 함께)
- diagnostics JSON 테이블 — debug URL에서만

## 검증

```bash
npx tsc --noEmit
npx tsx scripts/verify-capacity-policy-release.ts
npx tsx scripts/verify-building-roof-policy.ts
```

## 관련 코드 경로

| 경로 | 역할 |
|------|------|
| `src/data/solarConfig.ts` | areaPerKw, modulePowerW |
| `src/lib/solar/calculate.ts` | 대표 용량 metrics |
| `src/lib/solar/capacityResolution.ts` | A 산식, finalCapacity 정책 분기 |
| `src/lib/solar/resolveSiteGeometry.ts` | roofUsable → capacityAreaSqm |
| `src/app/api/module-layout/route.ts` | layout B + diagnostics |
| `src/app/api/report/pdf/route.ts` | PDF — `analyzeSolarSite` 동일 A |
| `src/components/result/ResultMetricsProvider.tsx` | UI metrics + consultationContext |
