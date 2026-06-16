import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin/auth";
import { listSearchHistory } from "@/lib/searchHistory/storage";
import type { SearchHistoryEntry } from "@/types/searchHistory";

function formatSearchedAtKst(iso: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

function escapeCsv(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function entryToCsvRow(entry: SearchHistoryEntry): string {
  return [
    formatSearchedAtKst(entry.searchedAt),
    entry.address,
    entry.landCategory,
    entry.zoning,
    entry.landArea,
    entry.buildingArea,
    entry.installType,
    entry.capacity,
    entry.annualGeneration,
    entry.annualRevenue,
    entry.consultSubmitted ? "Y" : "N",
  ]
    .map((value) => escapeCsv(value))
    .join(",");
}

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const entries = await listSearchHistory();
  const header =
    "조회일시,주소,지목,용도지역,토지면적,건축면적,설치유형,예상 설치용량,예상 발전량,예상 연매출,상담신청 여부";
  const rows = entries.map(entryToCsvRow);
  const csv = `\uFEFF${header}\n${rows.join("\n")}\n`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="search-history-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
