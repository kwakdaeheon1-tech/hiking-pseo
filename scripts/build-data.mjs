// 산림청 100대명산 CSV -> 정규화된 JSON (빌드 타임 전처리)
// 원본: data.go.kr/data/15112801 (이용허락범위 제한 없음)
// 안전정보(거리·소요시간·난이도)는 원본을 왜곡 없이 그대로 보존한다.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(fileURLToPath(import.meta.url), "../..");
const SRC = path.join(ROOT, "data/raw/100대명산_산림청_20250421.csv");
const OUT = path.join(ROOT, "src/data/mountains.json");
// 로컬에 원본이 없으면(예: CI 빌드) 공공데이터포털에서 직접 받는다. 이용허락범위 제한 없음.
const CSV_URL =
  "https://www.data.go.kr/cmm/cmm/fileDownload.do?atchFileId=FILE_000000003125262&fileDetailSn=1";

async function ensureCsv() {
  if (fs.existsSync(SRC)) return;
  console.log("[build-data] 원본 CSV가 없어 공공데이터포털에서 내려받는다...");
  const res = await fetch(CSV_URL, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      Referer: "https://www.data.go.kr/data/15112801/fileData.do",
    },
  });
  if (!res.ok) throw new Error(`CSV 다운로드 실패: HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.mkdirSync(path.dirname(SRC), { recursive: true });
  fs.writeFileSync(SRC, buf);
  console.log(`[build-data] 내려받음: ${(buf.length / 1024) | 0} KB`);
}

// --- CSV 파서 (따옴표/개행 포함 필드 대응) ---
function parseCSV(str) {
  const rows = [];
  let row = [], field = "", q = false;
  for (let i = 0; i < str.length; i++) {
    const c = str[i];
    if (q) {
      if (c === '"') { if (str[i + 1] === '"') { field += '"'; i++; } else q = false; }
      else field += c;
    } else {
      if (c === '"') q = true;
      else if (c === ",") { row.push(field); field = ""; }
      else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
      else if (c === "\r") { /* skip */ }
      else field += c;
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

// 원본은 HTML 엔티티가 1~2중으로 인코딩되어 있다.
function decodeEntities(s) {
  let prev = null, cur = s || "";
  for (let k = 0; k < 3 && cur !== prev; k++) {
    prev = cur;
    cur = cur
      .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
      .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&nbsp;/g, " ");
  }
  return cur;
}

// 태그 제거 + 공백 정리 (프로즈 필드용)
function stripHtml(s) {
  return decodeEntities(s)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function toParagraphs(s) {
  return stripHtml(s)
    .split(/\n{2,}|\n(?=[가-힣])/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter((p) => p.length > 1);
}

// 산행코스 필드의 <table> 파싱 -> [{구분, 구간, 소요시간}]
function parseCourseTable(raw) {
  const html = decodeEntities(raw);
  const trs = html.match(/<tr[\s\S]*?<\/tr>/gi) || [];
  const out = [];
  for (const tr of trs) {
    const cells = (tr.match(/<t[dh][\s\S]*?<\/t[dh]>/gi) || []).map((c) =>
      c.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim()
    );
    if (cells.length < 3) continue;
    if (/^구분$/.test(cells[0]) || /^구간$/.test(cells[1])) continue; // 헤더
    out.push({ 구분: cells[0], 구간: cells[1], 소요시간: cells[2] });
  }
  return out;
}

// "산행시간 : X 산높이 : Y 난이도 : Z" 분해 (콜론 누락 케이스 허용)
function parseGrade(raw) {
  const s = (raw || "").replace(/\s+/g, " ").trim();
  const m = s.match(/산행시간\s*:?\s*(.*?)\s*산높이\s*:?\s*(.*?)\s*난이도\s*:?\s*(.*)$/);
  if (!m) return { timeBand: "", heightBand: "", raw: s };
  const clean = (v) => v.replace(/^[-\s]*$/, "").trim();
  return { timeBand: clean(m[1]), heightBand: clean(m[2]), raw: clean(m[3]) };
}

// "약 4시간 45분" -> 4.75 (시간, 소수)
function parseHours(s) {
  const t = (s || "").replace(/\s+/g, "");
  const h = (t.match(/(\d+)시간/) || [])[1];
  const m = (t.match(/(\d+)분/) || [])[1];
  if (h == null && m == null) return null;
  return (+(h || 0)) + (+(m || 0)) / 60;
}

// 체감 난이도(정보성 보조 지표). 원본 소요시간대(공식 필드)가 있으면 그것을 신뢰하고,
// 없으면 코스표의 대표코스(추천코스) 시간, 그것도 없으면 중앙값으로 추정한다.
function feltLevel(timeBand, courses) {
  if (timeBand) {
    if (/^2시간/.test(timeBand)) return { level: "쉬움", score: 1 };
    if (/^3시간~/.test(timeBand)) return { level: "쉬움~보통", score: 2 };
    if (/^3시간30분/.test(timeBand)) return { level: "보통", score: 3 };
    if (/^4시간~/.test(timeBand)) return { level: "보통~다소 힘듦", score: 4 };
    if (/^4시간30분/.test(timeBand)) return { level: "다소 힘듦", score: 4 };
    if (/5시간이상/.test(timeBand)) return { level: "힘듦", score: 5 };
    return { level: "보통", score: 3 };
  }
  const rec = courses.find((c) => /추천/.test(c.구분));
  let hrs = rec ? parseHours(rec.소요시간) : null;
  if (hrs == null) {
    const all = courses.map((c) => parseHours(c.소요시간)).filter((x) => x != null).sort((a, b) => a - b);
    if (all.length) hrs = all[Math.floor((all.length - 1) / 2)]; // 중앙값(하위쪽)
  }
  if (hrs == null) return { level: "정보 없음", score: 0 };
  if (hrs < 2.5) return { level: "쉬움", score: 1 };
  if (hrs < 3.5) return { level: "쉬움~보통", score: 2 };
  if (hrs < 4.25) return { level: "보통", score: 3 };
  if (hrs < 5) return { level: "다소 힘듦", score: 4 };
  return { level: "힘듦", score: 5 };
}

function seasonHint(text) {
  const t = text || "";
  const tags = [];
  if (/단풍|억새|가을|만추|국화|구절초/.test(t)) tags.push("가을");
  if (/철쭉|진달래|봄|신록|벚꽃|야생화|얼레지|복수초|생강나무/.test(t)) tags.push("봄");
  if (/설경|눈꽃|상고대|겨울|빙벽|눈이 많|잔설|설산|설봉|적설|눈꽃축제|겨울산행/.test(t))
    tags.push("겨울");
  if (/피서|물놀이|여름|더위|녹음이 짙|시원한 계곡/.test(t) || (/계곡/.test(t) && /폭포/.test(t)))
    tags.push("여름");
  return [...new Set(tags)];
}

function shortRegion(pofloc) {
  // "강원도 홍천군 두촌면ㆍ화촌면, ..." -> "강원도 홍천군"
  const first = (pofloc || "").split(",")[0].trim();
  const m = first.match(/^(\S+(?:도|특별시|광역시|특별자치도|특별자치시))\s*(\S+(?:시|군|구))?/);
  if (!m) return first;
  return [m[1], m[2]].filter(Boolean).join(" ");
}

// --- 실행 ---
await ensureCsv();
const rawCsv = fs.readFileSync(SRC, "utf8").replace(/^﻿/, "");
const rows = parseCSV(rawCsv);
const header = rows[0];
const idx = (name) => header.indexOf(name);
const iName = idx("명산_이름"), iLoc = idx("명산_소재지"), iH = idx("명산_높이"),
  iGrade = idx("난이도"), iFeat = idx("특징_및_선정_이유"), iSummary = idx("산_개요"),
  iPoint = idx("산행포인트"), iCourse = idx("산행코스"), iTransit = idx("교통정보"),
  iY = idx("Y좌표"), iX = idx("X좌표");

const mountains = rows.slice(1).filter((r) => r[iName]).map((r) => {
  const name = r[iName].trim();
  const courses = parseCourseTable(r[iCourse]);
  const grade = parseGrade(r[iGrade]);
  const feat = stripHtml(r[iFeat]);
  const felt = feltLevel(grade.timeBand, courses);
  const seasons = seasonHint(feat + " " + stripHtml(r[iSummary]) + " " + stripHtml(r[iPoint]));
  const height = parseFloat(r[iH]) || null;
  return {
    name,
    slug: name, // 100대명산 이름은 유일. URL은 인코딩해서 사용.
    region: r[iLoc].trim(),
    regionShort: shortRegion(r[iLoc]),
    heightM: height,
    heightBand: grade.heightBand,
    timeBand: grade.timeBand,
    rawDifficulty: grade.raw,
    feltLevel: felt.level,
    feltScore: felt.score,
    seasons,
    featureReason: feat,
    summaryParas: toParagraphs(r[iSummary]),
    hikePointParas: toParagraphs(r[iPoint]),
    courses,
    transitParas: toParagraphs(r[iTransit]),
    lat: parseFloat(r[iY]) || null,
    lng: parseFloat(r[iX]) || null,
    source: {
      name: "산림청 국립자연휴양림관리소 · 숲나들e 100대명산 정보 (2025-04-21)",
      url: "https://www.data.go.kr/data/15112801/fileData.do",
      license: "이용허락범위 제한 없음",
    },
  };
});

// 데이터 완결성 리포트
const noCourse = mountains.filter((m) => m.courses.length === 0).map((m) => m.name);
const noTime = mountains.filter((m) => !m.timeBand).map((m) => m.name);

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(mountains, null, 2), "utf8");
console.log(`[build-data] ${mountains.length}개 산 -> ${path.relative(ROOT, OUT)}`);
console.log(`  코스표 없음: ${noCourse.length}개${noCourse.length ? " (" + noCourse.slice(0, 8).join(", ") + " ...)" : ""}`);
console.log(`  소요시간대 미기재(코스표로 보완): ${noTime.length}개`);
