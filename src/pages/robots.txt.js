import { SITE } from "../consts.mjs";

export function GET() {
  const body = `User-agent: *
Allow: /

Sitemap: ${new URL("/sitemap.xml", SITE.url).href}
`;
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
