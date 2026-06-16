"use client";

import { useCallback, useEffect, useState } from "react";
import AdminNav from "@/components/admin/AdminNav";
import type { GridAdminRecord } from "@/types/gridConnection";

export default function AdminGridDashboard() {
  const [records, setRecords] = useState<GridAdminRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [jsonText, setJsonText] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/grid-data");
      if (!res.ok) throw new Error("load failed");
      const data = (await res.json()) as { records: GridAdminRecord[] };
      setRecords(data.records);
    } catch {
      setMessage("목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const selectRecord = (record: GridAdminRecord) => {
    setSelectedId(record.id);
    setJsonText(JSON.stringify(record, null, 2));
    setMessage("");
  };

  const save = async () => {
    try {
      const parsed = JSON.parse(jsonText) as GridAdminRecord;
      const res = await fetch("/api/admin/grid-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed),
      });
      if (!res.ok) throw new Error("save failed");
      setMessage("저장되었습니다.");
      await load();
    } catch {
      setMessage("저장 실패 — JSON 형식을 확인해 주세요.");
    }
  };

  const remove = async (id: string) => {
    if (!confirm(`"${id}" 레코드를 삭제할까요?`)) return;
    const res = await fetch(`/api/admin/grid-data?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setMessage("삭제되었습니다.");
      setSelectedId(null);
      setJsonText("");
      await load();
    }
  };

  const newRecord = () => {
    const template: GridAdminRecord = {
      id: `region-${Date.now()}`,
      regionKeywords: ["시군구", "읍면동"],
      dataAsOfDate: new Date().toISOString().slice(0, 10),
      contacts: {
        kepcoBranch: "한국전력 ○○지사",
        branchPhone: "000-000-0000",
        supplyDepartment: "태양광 계통검토 담당",
        supplyPhone: "000-000-0000",
        operationsDepartment: "배전계통 담당",
        operationsPhone: "000-000-0000",
      },
      poles: [
        {
          poleId: "000-0",
          label: "000-0",
          referenceLocation: "기준 위치",
          substation: { name: "○○변전소", cumulativeMw: 0, remainingMw: 0 },
          transformer: { name: "MTR-1", cumulativeMw: 0, remainingMw: 0 },
          distributionLine: { name: "○○D/L-01", cumulativeMw: 0, remainingMw: 0 },
        },
      ],
      updatedAt: new Date().toISOString(),
    };
    setSelectedId(template.id);
    setJsonText(JSON.stringify(template, null, 2));
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <AdminNav active="grid-data" />
      <h1 className="text-2xl font-bold text-navy">계통연계 데이터 관리</h1>
      <p className="mt-2 text-sm text-slate-600">
        지역 키워드(regionKeywords)로 주소 매칭 · Redis/로컬 JSON 저장 · seed.json은 기본 제공
      </p>

      {message && (
        <p className="mt-4 rounded-lg bg-slate-100 px-4 py-2 text-sm text-slate-800">{message}</p>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">등록 레코드</h2>
            <button
              type="button"
              onClick={newRecord}
              className="rounded-lg bg-navy px-3 py-1.5 text-xs font-semibold text-white"
            >
              + 신규
            </button>
          </div>
          {loading ? (
            <p className="mt-4 text-sm text-slate-500">불러오는 중…</p>
          ) : (
            <ul className="mt-4 max-h-[480px] space-y-2 overflow-y-auto">
              {records.map((record) => (
                <li key={record.id}>
                  <button
                    type="button"
                    onClick={() => selectRecord(record)}
                    className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                      selectedId === record.id
                        ? "border-navy bg-navy-light"
                        : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <span className="font-semibold">{record.id}</span>
                    <span className="mt-1 block text-xs text-slate-500">
                      {record.regionKeywords.join(" · ")} · 전주 {record.poles.length}개
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="font-semibold text-slate-900">JSON 편집</h2>
          <textarea
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            rows={22}
            className="mt-3 w-full rounded-lg border border-slate-300 p-3 font-mono text-xs"
            placeholder="레코드를 선택하거나 신규를 만드세요"
          />
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => void save()}
              disabled={!jsonText}
              className="rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              저장
            </button>
            {selectedId && (
              <button
                type="button"
                onClick={() => void remove(selectedId)}
                className="rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-700"
              >
                삭제
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
