/**
 * 계통연계 샘플 주소 테스트
 * npx tsx scripts/grid-connection-test.mjs
 */
import { resolveGridConnection } from "../src/lib/grid/resolve.ts";

const cases = [
  {
    name: "운봉리 114 (고성군)",
    input: {
      lat: 38.38,
      lng: 128.47,
      address: "강원특별자치도 고성군 토성면 운봉리 114",
      jibunAddress: "강원특별자치도 고성군 토성면 운봉리 114",
      capacityKw: 1560.6,
    },
  },
  {
    name: "남원 (데모 seed)",
    input: {
      lat: 35.41,
      lng: 127.39,
      address: "전북특별자치도 남원시 금동",
      jibunAddress: "전북특별자치도 남원시 금동 258-7",
      capacityKw: 500,
    },
  },
  {
    name: "판교 (데모 seed)",
    input: {
      lat: 37.39,
      lng: 127.11,
      address: "경기도 성남시 분당구 판교역로 235",
      jibunAddress: "경기도 성남시 분당구 판교동 142-3",
      capacityKw: 200,
    },
  },
  {
    name: "데이터 없음 (임의 주소)",
    input: {
      lat: 36.5,
      lng: 127.5,
      address: "대전광역시 서구 둔산동 100",
      jibunAddress: "대전광역시 서구 둔산동 100",
      capacityKw: 300,
    },
  },
];

for (const c of cases) {
  const g = await resolveGridConnection(c.input);
  console.log(`\n=== ${c.name} ===`);
  console.log("상태:", g.statusLabel);
  console.log("전주:", g.selectedPoleId, "| 변전소:", g.substation.name);
  console.log("D/L:", g.distributionLine.name, "| 잔여:", g.remainingCapacityDisplay);
  console.log("검토:", g.reviewResult);
  console.log("출처:", g.dataSource);
}
