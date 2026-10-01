/* ===========================================================
   共有用の画像（OGP画像 1200×630）を書き出す：npm run og
   文言は ./og.config.mjs、ツール名とアイコンは src/data/hub.js と src/lib/icons.js から読む。
   見た目は public/og/ogp.png（デザインの元データから作った画像）にそろえている。
   - Google Chrome を使う（入っていなければ、環境変数 CHROME に Chrome / Chromium の実行ファイルの場所を入れる）
   - 見出しのフォント（M PLUS Rounded 1c）を Google Fonts から読むので、ネットにつないで実行する
   =========================================================== */
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import HUB from "../../src/data/hub.js";
import { svg, toolSvg } from "../../src/lib/icons.js";
import { OG } from "./og.config.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const only = process.argv[2]; // npm run og -- seat で1枚だけ

/* 見出し：\n で改行、{ } を強調 */
// 行の頭が「 や （ のときは、括弧の前のアキ（半文字）だけ左に寄せて、ほかの行と頭をそろえる
const title = (t) => t.split("\n").map((line) => `<span class="line${/^[「『（【〈《]/.test(line) ? " hang" : ""}">${esc(line).replace(/\{(.+?)\}/g, '<span class="hl">$1</span>')}</span>`).join("");

function badge(item) {
  if (item.slug === "common") {
    // 共通の画像は、公開中のツールのアイコンを並べる
    const live = HUB.TOOLS.filter((t) => t.status === "live").sort((a, b) => (a.hot ?? 99) - (b.hot ?? 99));
    return `<div class="badge tiles">${live.map((t) => `<span class="tile">${toolSvg(t.icon, 30)}</span>`).join("")}</div>`;
  }
  const t = HUB.TOOLS.find((x) => x.slug === item.slug);
  if (!t) throw new Error(`hub.js に ${item.slug} がありません`);
  return `<div class="badge"><span class="tile">${toolSvg(t.icon, 30)}</span><span class="badge-name">${esc(t.name)}</span></div>`;
}

const page = (item) => `<!doctype html><html lang="ja"><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=M+PLUS+Rounded+1c:wght@800&display=block" rel="stylesheet">
<style>
  :root{--ink:oklch(0.20 0.014 230);--ink-2:oklch(0.35 0.012 226);--line-2:oklch(0.80 0.006 220);--primary:oklch(0.47 0.095 205);--primary-ink:oklch(0.40 0.095 207);--hl:oklch(0.88 0.05 198);
    --display:"M PLUS Rounded 1c","Hiragino Maru Gothic ProN",sans-serif;--body:"Hiragino Sans","Hiragino Kaku Gothic ProN","Noto Sans JP",sans-serif}
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:1200px;height:630px;overflow:hidden;background:#fff}
  body{position:relative;font-family:var(--body);color:var(--ink);-webkit-font-smoothing:antialiased}
  .dots{position:absolute;inset:0;background-image:radial-gradient(circle at center,oklch(0.72 0.006 225 / .55) 1.4px,transparent 1.9px);background-size:28px 28px;-webkit-mask-image:radial-gradient(ellipse 75% 85% at 78% 30%,#000 30%,transparent 78%)}
  .glow{position:absolute;top:-260px;right:-180px;width:900px;height:640px;background:radial-gradient(ellipse 50% 55% at 55% 45%,oklch(0.93 0.035 200 / .75),transparent 70%)}
  .logo{position:absolute;left:80px;top:62px;display:flex;align-items:center;gap:18px;font-family:var(--display);font-weight:800;font-size:34px;letter-spacing:.005em}
  .logo-mark{width:64px;height:64px;border-radius:17px;display:grid;place-items:center;color:#fff;background:linear-gradient(150deg,oklch(0.52 0.095 203),oklch(0.36 0.09 208));box-shadow:0 10px 22px -8px oklch(0.47 0.095 205 / .55),inset 0 1px 0 rgba(255,255,255,.35)}
  .logo .sub{color:var(--primary-ink);margin-left:10px}
  .badge{position:absolute;right:80px;top:70px;display:flex;align-items:center;gap:14px;background:#fff;border:1.5px solid var(--line-2);border-radius:18px;padding:10px 24px 10px 10px;box-shadow:0 12px 30px -16px rgba(20,38,52,.28),0 3px 8px rgba(20,38,52,.06)}
  .badge.tiles{padding:10px;gap:10px}
  .tile{width:52px;height:52px;border-radius:14px;display:grid;place-items:center;color:#fff;background:linear-gradient(150deg,oklch(0.53 0.095 203),oklch(0.40 0.09 207))}
  .badge-name{font-family:var(--display);font-weight:800;font-size:27px;color:var(--ink);white-space:nowrap}
  .title{position:absolute;left:80px;top:196px;right:60px;font-family:var(--display);font-weight:800;font-size:var(--fs,88px);line-height:1.26;letter-spacing:-.01em}
  .line{display:block;white-space:nowrap}
  .line.hang{margin-left:-.5em}
  .hl{color:var(--primary-ink);position:relative;z-index:0}
  .hl::after{content:"";position:absolute;left:-6px;right:-6px;bottom:.1em;height:.36em;background:var(--hl);border-radius:8px;z-index:-1}
  .points{position:absolute;left:80px;top:446px;display:flex;gap:16px}
  .point{display:inline-flex;align-items:center;gap:12px;font-weight:700;font-size:24px;color:var(--ink-2);border:1.5px solid var(--line-2);border-radius:99px;padding:12px 26px;background:#fff;white-space:nowrap}
  .point::before{content:"";width:11px;height:11px;border-radius:99px;background:var(--primary)}
  .stripe{position:absolute;left:0;right:0;bottom:0;height:16px;background-color:oklch(0.87 0.04 198);background-image:linear-gradient(45deg,var(--primary) 25%,transparent 25% 50%,var(--primary) 50% 75%,transparent 75%);background-size:22px 22px}
</style></head><body>
  <div class="glow"></div><div class="dots"></div>
  <div class="logo"><span class="logo-mark">${svg("bolt", 32, { stroke: 2 })}</span><span>insemble<span class="sub">tools</span></span></div>
  ${badge(item)}
  <h1 class="title">${title(item.title)}</h1>
  <div class="points">${item.points.map((p) => `<span class="point">${esc(p)}</span>`).join("")}</div>
  <div class="stripe"></div>
</body></html>`;

const exe = process.env.CHROME;
const browser = await chromium.launch(exe ? { executablePath: exe } : { channel: "chrome" });
const ctx = await browser.newContext({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
const tab = await ctx.newPage();
mkdirSync(join(root, "public", "og"), { recursive: true });

for (const item of OG) {
  if (only && item.slug !== only) continue;
  await tab.setContent(page(item), { waitUntil: "networkidle" });
  const ok = await tab.evaluate(async () => { await document.fonts.ready; return document.fonts.check('800 88px "M PLUS Rounded 1c"', "あ"); });
  if (!ok) console.warn(`[og] ${item.slug}: M PLUS Rounded 1c を読めませんでした（代わりの丸ゴシックで書き出します）`);
  // 見出しや特長が枠からはみ出すなら、見出しの文字を小さくする
  await tab.evaluate(() => {
    const t = document.querySelector(".title");
    let fs = 88;
    while (fs > 56 && t.scrollWidth > t.clientWidth) {
      fs -= 4;
      t.style.setProperty("--fs", fs + "px");
    }
    const pts = document.querySelector(".points");
    if (pts.getBoundingClientRect().right > 1140) pts.style.transform = `scale(${1060 / pts.scrollWidth})`, (pts.style.transformOrigin = "left center");
  });
  const out = join(root, "public", item.out ? item.out : join("og", `${item.slug}.png`));
  await tab.screenshot({ path: out, type: "png" });
  console.log(`[og] ${out.replace(root + "/", "")}`);
}
await browser.close();
