/**
 * 한전ON 사업소정보 CSV → 정규화 JSON
 * 출처: 공공데이터포털 한국전력공사_한전ON 사업소정보_20240913
 *
 * Usage: node scripts/build-kepco-office-contacts.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const CSV_PATH = path.join(ROOT, "scripts", "tmp-kepco-on-offices.csv");
const OUT_PATH = path.join(ROOT, "src", "data", "kepco", "kepco-on-office-contacts.json");

const SOURCE = "한국전력공사_한전ON 사업소정보_20240913";
const LAST_CHECKED = "2026-06-23";
const FALLBACK_PHONE = "123";

const PHONE_RE = /^\d{2,3}-\d{2,4}-\d{4}$/;

/** 낮을수록 우선 (태양광 계통 문의용) */
function scoreRow(department, taskName) {
  const dept = department.trim();
  const task = taskName.trim();
  let base = 99;

  if (dept.includes("전력공급부")) base = 1;
  else if (dept.includes("배전운영부")) base = 2;
  else if (/신증설|증설/.test(task)) base = 3;
  else if (/전기사용신청|전기사용/.test(task)) base = 4;
  else if (/영업|신규/.test(task)) base = 5;
  else if (dept.includes("고객지원부")) base = 6;
  else base = 7;

  let bonus = 0;
  if (/태양광|PPA|신재생|분산형전원|선로용량/.test(task)) bonus -= 0.5;
  if (/고압/.test(task) && base <= 5) bonus -= 0.1;

  return base + bonus;
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter(Boolean);
  const header = lines[0].split(",");
  if (header.length !== 10) {
    throw new Error(`Expected 10 CSV columns, got ${header.length}`);
  }

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",");
    if (cols.length !== 10) continue;
    rows.push({
      hqName: cols[0],
      officeName: cols[1],
      officeAddress: cols[2],
      zipCode: cols[3],
      jurisdiction: cols[4],
      departmentName: cols[5],
      taskName: cols[6],
      phone: cols[7].trim(),
      fax: cols[8].trim(),
    });
  }
  return rows;
}

function pickBestContact(rows) {
  const valid = rows.filter((r) => PHONE_RE.test(r.phone));
  if (valid.length === 0) return null;

  return [...valid].sort((a, b) => {
    const diff = scoreRow(a.departmentName, a.taskName) - scoreRow(b.departmentName, b.taskName);
    if (diff !== 0) return diff;
    return a.phone.localeCompare(b.phone);
  })[0];
}

function main() {
  if (!fs.existsSync(CSV_PATH)) {
    console.error(`Missing source CSV: ${CSV_PATH}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(CSV_PATH);
  const text = new TextDecoder("euc-kr").decode(raw);
  const rows = parseCsv(text);

  const byOffice = new Map();
  for (const row of rows) {
    if (!row.officeName) continue;
    const list = byOffice.get(row.officeName) ?? [];
    list.push(row);
    byOffice.set(row.officeName, list);
  }

  const offices = {};
  for (const [officeName, officeRows] of byOffice) {
    const best = pickBestContact(officeRows);
    const address = officeRows.find((r) => r.officeAddress)?.officeAddress ?? "";

    offices[officeName] = {
      officeName,
      officePhone: best?.phone ?? null,
      officeAddress: address,
      departmentName: best?.departmentName ?? null,
      taskName: best?.taskName ?? null,
      fallbackPhone: FALLBACK_PHONE,
      phoneStatus: best ? "official_page" : "unknown",
      source: SOURCE,
      lastCheckedAt: LAST_CHECKED,
    };
  }

  const aliases = {
    전주지사: "남전주지사",
  };

  const withPhone = Object.values(offices).filter((o) => o.officePhone).length;

  const output = {
    meta: {
      source: SOURCE,
      generatedAt: new Date().toISOString().slice(0, 10),
      rawRowCount: rows.length,
      officeCount: Object.keys(offices).length,
      officesWithPhone: withPhone,
    },
    aliases,
    offices,
  };

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, `${JSON.stringify(output, null, 2)}\n`, "utf8");

  console.log(`Wrote ${OUT_PATH}`);
  console.log(`Offices: ${output.meta.officeCount}, with phone: ${withPhone}`);
}

main();
