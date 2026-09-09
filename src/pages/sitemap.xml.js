import mountains from "../data/mountains.json";
import { SITE } from "../consts.mjs";

export function GET() {
  const urls = [
    "/",
    "/san/",
    "/about/",
    ...mountains.map((m) => `/san/${encodeURIComponent(m.slug)}/`),
  ];
  const today = new Date().toISOString().slice(0, 10);
  const rows = urls
    .map(
      (u) =>
        `  <url><loc>${new URL(u, SITE.url).href}</loc><lastmod>${today}</lastmod><changefreq>monthly</changefreq></url>`
    )
    .join("\n");
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${rows}
</urlset>
`;
  return new Response(body, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
}
