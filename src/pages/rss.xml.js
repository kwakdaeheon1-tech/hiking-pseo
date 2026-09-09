import mountains from "../data/mountains.json";
import { SITE } from "../consts.mjs";

export function GET() {
  const items = mountains
    .map((m) => {
      const link = new URL(`/san/${encodeURIComponent(m.slug)}/`, SITE.url).href;
      const desc = `${m.name}(${m.regionShort}, ${m.heightM ?? "?"}m) 등산코스 ${m.courses.length}개, 체감 난이도 ${m.feltLevel}.`;
      return `<item><title>${esc(m.name)} 등산코스 완벽 가이드</title><link>${link}</link><guid>${link}</guid><description>${esc(desc)}</description></item>`;
    })
    .join("");
  const xml = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>${esc(SITE.name)}</title><link>${SITE.url}</link><description>${esc(SITE.description)}</description><language>ko</language>${items}</channel></rss>`;
  return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
}

function esc(s) {
  return String(s).replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c]));
}
