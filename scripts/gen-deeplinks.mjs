// 쿠팡 파트너스 딥링크 생성 — gear.json 의 키워드를 link.coupang.com 정식 추적 링크로 변환.
// 로컬에서만 실행: 키는 .env(커밋 안 됨)에서 읽고, 결과 shortenUrl(공개)만 src/data/deeplinks.json 에 저장.
//
// 실행:  npm run deeplinks       (.env 에 COUPANG_ACCESS_KEY / COUPANG_SECRET_KEY 필요)
//
// 키 발급: 쿠팡 파트너스 → 개발자 도구(오픈 API) → 인증키 발급
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(fileURLToPath(import.meta.url), "../..");
const GEAR = path.join(ROOT, "src/data/gear.json");
const OUT = path.join(ROOT, "src/data/deeplinks.json");
const ENV = path.join(ROOT, ".env");

// --- .env 로더 (의존성 없이) ---
function loadEnv() {
  if (!fs.existsSync(ENV)) return;
  for (const line of fs.readFileSync(ENV, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/i);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
loadEnv();

const ACCESS = process.env.COUPANG_ACCESS_KEY;
const SECRET = process.env.COUPANG_SECRET_KEY;
const SUBID = process.env.COUPANG_SUBID || ""; // 채널 구분용(선택)

if (!ACCESS || !SECRET) {
  console.error(
    "[deeplinks] .env 에 COUPANG_ACCESS_KEY / COUPANG_SECRET_KEY 가 없습니다.\n" +
      "  쿠팡 파트너스 → 개발자 도구(오픈 API) → 인증키 발급 후 프로젝트 루트 .env 에 넣으세요:\n" +
      "    COUPANG_ACCESS_KEY=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx\n" +
      "    COUPANG_SECRET_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
  );
  process.exit(1);
}

const DOMAIN = "https://api-gateway.coupang.com";
const URLPATH = "/v2/providers/affiliate_open_api/apis/openapi/v1/deeplink";

// 쿠팡 HMAC 서명 (CEA 스킴)
function authHeader(method, urlpath, query = "") {
  const datetime =
    new Date().toISOString().substring(2, 19).replace(/:/g, "").replace(/-/g, "") + "Z"; // yyMMddTHHmmssZ
  const message = datetime + method + urlpath + query;
  const signature = crypto.createHmac("sha256", SECRET).update(message).digest("hex");
  return `CEA algorithm=HmacSHA256, access-key=${ACCESS}, signed-date=${datetime}, signature=${signature}`;
}

const gear = JSON.parse(fs.readFileSync(GEAR, "utf8"));
const keywords = [...new Set(gear.items.map((it) => it.keyword))];
const coupangUrls = keywords.map(
  (k) => "https://www.coupang.com/np/search?q=" + encodeURIComponent(k)
);

const body = JSON.stringify({ coupangUrls, ...(SUBID ? { subId: SUBID } : {}) });

const res = await fetch(DOMAIN + URLPATH, {
  method: "POST",
  headers: {
    Authorization: authHeader("POST", URLPATH),
    "Content-Type": "application/json;charset=UTF-8",
  },
  body,
});

const text = await res.text();
if (!res.ok) {
  console.error(`[deeplinks] API 오류 HTTP ${res.status}\n${text}`);
  process.exit(1);
}

const json = JSON.parse(text);
if (json.rCode && json.rCode !== "0") {
  console.error(`[deeplinks] API 응답 오류: ${json.rCode} ${json.rMessage}`);
  process.exit(1);
}

// 응답 순서가 요청 순서와 같다고 보장되지 않으므로 originalUrl 로 매칭
const map = {};
for (const row of json.data || []) {
  const q = new URL(row.originalUrl).searchParams.get("q");
  if (q) map[q] = row.shortenUrl || row.landingUrl;
}

const result = {};
let hit = 0;
for (const k of keywords) {
  if (map[k]) {
    result[k] = map[k];
    hit++;
  }
}

fs.writeFileSync(OUT, JSON.stringify(result, null, 2) + "\n", "utf8");
console.log(`[deeplinks] ${hit}/${keywords.length}개 키워드 딥링크 생성 -> ${path.relative(ROOT, OUT)}`);
if (hit < keywords.length) {
  console.warn("  누락:", keywords.filter((k) => !result[k]).join(", "));
}
