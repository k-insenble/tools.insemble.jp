/* ===========================================================
   OGPチェッカー — プレビューするサービスと、フレームワーク別のコード
   結果パネル（src/scripts/ogp/results.js）から使う
   =========================================================== */
export const PLATFORMS = {
  sns: [
    { id: "x", name: "X（Twitter）", color: "#0f1419", glyph: "𝕏" },
    { id: "facebook", name: "Facebook", color: "#1877f2", glyph: "f" },
    { id: "line", name: "LINE", color: "#06c755", glyph: "L" },
  ],
  chat: [
    { id: "slack", name: "Slack", color: "#4a154b", glyph: "#" },
    { id: "discord", name: "Discord", color: "#5865f2", glyph: "◇" },
    { id: "teams", name: "Microsoft Teams", color: "#5059c9", glyph: "T" },
  ],
};

// ---- フレームワーク別テンプレート ------------------------------
// 値はチェックしたページから来る。利用者がそのまま貼るコードなので、書く場所に合わせて必ずエスケープする
// q：JS の文字列（"…" ごと返す。</script> で閉じられないよう < も逃がす）／ a：HTML・JSX の属性値
const q = (s) => JSON.stringify(String(s ?? "")).replace(/</g, "\\u003c");
const a = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
export const FRAMEWORKS = ["HTML", "Next.js", "Nuxt 3", "Vue 3", "Astro", "React", "Remix"];

export function frameworkCode(fw, d) {
  const t = d.previewTitle;
  const desc = d.previewDesc;
  const img = d.imageUrl || "https://example.com/ogp.png"; // タグ一覧の値だと未設定のとき「未設定」が入り、相対パスもそのまま出てしまう
  const site = d.siteName;
  const url = d.url;
  if (fw === "HTML") {
    return `<head>
  <!-- og:title -->
  <meta property="og:title" content="${a(t)}">
  <!-- og:description -->
  <meta property="og:description" content="${a(desc)}">
  <!-- og:image -->
  <meta property="og:image" content="${a(img)}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:site_name" content="${a(site)}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${a(url)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${a(t)}">
  <meta name="twitter:description" content="${a(desc)}">
  <meta name="twitter:image" content="${a(img)}">
  <link rel="canonical" href="${a(url)}">
</head>`;
  }
  if (fw === "Next.js") {
    return `// app/page.tsx — Next.js App Router
export const metadata = {
  title: ${q(t)},
  description: ${q(desc)},
  openGraph: {
    title: ${q(t)},
    description: ${q(desc)},
    url: ${q(url)},
    siteName: ${q(site)},
    images: [{ url: ${q(img)}, width: 1200, height: 630 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: ${q(t)},
    description: ${q(desc)},
    images: [${q(img)}],
  },
};`;
  }
  if (fw === "Nuxt 3") {
    return `<script setup>
useSeoMeta({
  title: ${q(t)},
  ogTitle: ${q(t)},
  description: ${q(desc)},
  ogDescription: ${q(desc)},
  ogImage: ${q(img)},
  ogUrl: ${q(url)},
  ogSiteName: ${q(site)},
  ogType: "website",
  twitterCard: "summary_large_image",
  twitterImage: ${q(img)},
})
</script>`;
  }
  if (fw === "Vue 3") {
    return `import { useHead } from "@unhead/vue"

useHead({
  meta: [
    { property: "og:title", content: ${q(t)} },
    { property: "og:description", content: ${q(desc)} },
    { property: "og:image", content: ${q(img)} },
    { property: "og:url", content: ${q(url)} },
    { property: "og:site_name", content: ${q(site)} },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:image", content: ${q(img)} },
  ],
})`;
  }
  if (fw === "Astro") {
    return `---
// src/layouts/Layout.astro
const { } = Astro.props;
---
<head>
  <meta property="og:title" content="${a(t)}" />
  <meta property="og:description" content="${a(desc)}" />
  <meta property="og:image" content="${a(img)}" />
  <meta property="og:url" content="${a(url)}" />
  <meta property="og:site_name" content="${a(site)}" />
  <meta property="og:type" content="website" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:image" content="${a(img)}" />
</head>`;
  }
  if (fw === "React") {
    return `// react-helmet-async
import { Helmet } from "react-helmet-async";

<Helmet>
  <meta property="og:title" content="${a(t)}" />
  <meta property="og:description" content="${a(desc)}" />
  <meta property="og:image" content="${a(img)}" />
  <meta property="og:url" content="${a(url)}" />
  <meta property="og:site_name" content="${a(site)}" />
  <meta property="og:type" content="website" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:image" content="${a(img)}" />
</Helmet>`;
  }
  if (fw === "Remix") {
    return `// app/routes/_index.tsx
export const meta = () => [
  { property: "og:title", content: ${q(t)} },
  { property: "og:description", content: ${q(desc)} },
  { property: "og:image", content: ${q(img)} },
  { property: "og:url", content: ${q(url)} },
  { property: "og:site_name", content: ${q(site)} },
  { property: "og:type", content: "website" },
  { name: "twitter:card", content: "summary_large_image" },
  { name: "twitter:image", content: ${q(img)} },
];`;
  }
  return "";
}
