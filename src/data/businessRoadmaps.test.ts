import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getBusinessRoadmap,
  resolveBusinessRoadmapKind,
} from "../data/businessRoadmaps";

describe("business roadmap kind", () => {
  it("maps net metering install type", () => {
    assert.equal(resolveBusinessRoadmapKind("상계거래(가정용)"), "net_metering");
    const roadmap = getBusinessRoadmap("상계거래(가정용)");
    assert.equal(roadmap.sourceTitle, "가정용 상계거래형 태양광 프로세스");
    assert.equal(roadmap.phases.length, 6);
    assert.ok(!roadmap.phases.some((p) => p.title.includes("실시설계")));
    assert.ok(roadmap.phases.some((p) => p.title.includes("상계거래")));
  });

  it("maps land/roof to RPS path", () => {
    assert.equal(resolveBusinessRoadmapKind("토지형"), "rps");
    assert.equal(resolveBusinessRoadmapKind("지붕형"), "rps");
    const roadmap = getBusinessRoadmap("토지형");
    assert.equal(roadmap.sourceTitle, "사업용 RPS 태양광 프로세스");
    assert.equal(roadmap.phases.length, 5);
    assert.equal(roadmap.phases[0]?.statusLabel, "1차 입지검토 완료");
    assert.ok(roadmap.detailSteps.length >= 14);
  });

  it("does not invent PPA without explicit type", () => {
    assert.notEqual(resolveBusinessRoadmapKind("지붕형"), "ppa");
  });
});
