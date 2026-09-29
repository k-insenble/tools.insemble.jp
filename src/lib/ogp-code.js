/* ===========================================================
   OGPチェッカー — プレビューするサービスと、フレームワーク別のコード
   結果パネル（src/scripts/ogp/results.js）から使う
   =========================================================== */
export const PLATFORMS = {
  sns: [
    { id: "x", name: "X (Twitter)", color: "#0f1419", glyph: "𝕏" },
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
export const FRAMEWORKS = ["HTML", "Next.js", "Nuxt 3", "Vue 3", "Astro", "React", "Remix"];

export function frameworkCode(fw, d) {
  const t = d.previewTitle;
  const desc = d.previewDesc;
  const img = (d.tags.find((x) => x.key === "og:image") || {}).value || "https://example.com/ogp.png";
  const site = d.siteName;
  const url = d.url;
  if (fw === "HTML") {
    return `<head>
  <!-- og:title -->
  <meta property="og:title" content="${t}">
  <!-- og:description -->
  <meta property="og:description" content="${desc}">
  <!-- og:image -->
  <meta property="og:image" content="${img}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:site_name" content="${site}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${url}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${t}">
  <meta name="twitter:description" content="${desc}">
  <meta name="twitter:image" content="${img}">
  <link rel="canonical" href="${url}">
</head>`;
  }
  if (fw === "Next.js") {
    return `// app/page.tsx — Next.js App Router
export const metadata = {
  title: "${t}",
  description: "${desc}",
  openGraph: {
    title: "${t}",
    description: "${desc}",
    url: "${url}",
    siteName: "${site}",
    images: [{ url: "${img}", width: 1200, height: 630 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "${t}",
    description: "${desc}",
    images: ["${img}"],
  },
};`;
  }
  if (fw === "Nuxt 3") {
    return `<script setup>
useSeoMeta({
  title: "${t}",
  ogTitle: "${t}",
  description: "${desc}",
  ogDescription: "${desc}",
  ogImage: "${img}",
  ogUrl: "${url}",
  ogSiteName: "${site}",
  ogType: "website",
  twitterCard: "summary_large_image",
  twitterImage: "${img}",
})
</script>`;
  }
  if (fw === "Vue 3") {
    return `import { useHead } from '@unhead/vue'

useHead({
  meta: [
    { property: 'og:title', content: '${t}' },
    { property: 'og:description', content: '${desc}' },
    { property: 'og:image', content: '${img}' },
    { property: 'og:url', content: '${url}' },
    { property: 'og:site_name', content: '${site}' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:image', content: '${img}' },
  ],
})`;
  }
  if (fw === "Astro") {
    return `---
// src/layouts/Layout.astro
const { } = Astro.props;
---
<head>
  <meta property="og:title" content="${t}" />
  <meta property="og:description" content="${desc}" />
  <meta property="og:image" content="${img}" />
  <meta property="og:url" content="${url}" />
  <meta property="og:site_name" content="${site}" />
  <meta property="og:type" content="website" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:image" content="${img}" />
</head>`;
  }
  if (fw === "React") {
    return `// react-helmet-async
import { Helmet } from "react-helmet-async";

<Helmet>
  <meta property="og:title" content="${t}" />
  <meta property="og:description" content="${desc}" />
  <meta property="og:image" content="${img}" />
  <meta property="og:url" content="${url}" />
  <meta property="og:site_name" content="${site}" />
  <meta property="og:type" content="website" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:image" content="${img}" />
</Helmet>`;
  }
  if (fw === "Remix") {
    return `// app/routes/_index.tsx
export const meta = () => [
  { property: "og:title", content: "${t}" },
  { property: "og:description", content: "${desc}" },
  { property: "og:image", content: "${img}" },
  { property: "og:url", content: "${url}" },
  { property: "og:site_name", content: "${site}" },
  { property: "og:type", content: "website" },
  { name: "twitter:card", content: "summary_large_image" },
  { name: "twitter:image", content: "${img}" },
];`;
  }
  return "";
}
