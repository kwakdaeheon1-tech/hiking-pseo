import { defineConfig } from "astro/config";
import { SITE } from "./src/consts.mjs";

export default defineConfig({
  site: SITE.url,
  trailingSlash: "always",
  build: { format: "directory" },
  compressHTML: true,
});
