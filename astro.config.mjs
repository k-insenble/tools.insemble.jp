import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  site: "https://tools.insemble.jp",
  trailingSlash: "always",
  build: { format: "directory" },
  integrations: [sitemap()],
  vite: {
    plugins: [tailwindcss()],
    // PHPを手元で動かす場合：`php -S localhost:8000 -t public` を起動し、.env.development の PUBLIC_OGP_MOCK を false に
    server: { proxy: { "/api": "http://localhost:8000" } },
  },
});
