import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import { copyFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

/* @astrojs/sitemap は sitemap-index.xml（目次）と sitemap-0.xml（本体）を出す。
   /sitemap.xml を見に来る人やツールのために、同じ中身を sitemap.xml としても置く（sitemap() より後ろに並べる） */
const sitemapAlias = () => ({
  name: "sitemap-alias",
  hooks: {
    "astro:build:done": ({ dir, logger }) => {
      const out = fileURLToPath(dir);
      if (!existsSync(out + "sitemap-index.xml")) return logger.warn("sitemap-index.xml がないので、sitemap.xml を作れませんでした");
      copyFileSync(out + "sitemap-index.xml", out + "sitemap.xml");
      logger.info("sitemap.xml を作りました（sitemap-index.xml と同じ中身）");
    },
  },
});

export default defineConfig({
  site: "https://tools.insemble.jp",
  trailingSlash: "always",
  build: { format: "directory" },
  integrations: [sitemap(), sitemapAlias()],
  vite: {
    plugins: [tailwindcss()],
    // PHPを手元で動かす場合：`php -S localhost:8000 -t public` を起動し、.env.development の PUBLIC_OGP_MOCK を false に
    server: { proxy: { "/api": "http://localhost:8000" } },
  },
});
