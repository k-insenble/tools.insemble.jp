/* ===========================================================
   OGPチェッカー：取得と採点
   - 本番：/api/ogp.php（Xserver の PHP）でページの <head> を取得し、ここで採点する
   - 開発：PUBLIC_OGP_MOCK=true のとき、src/data/ogp-samples.js のサンプルを返す
   =========================================================== */
const MOCK = import.meta.env.PUBLIC_OGP_MOCK === "true";
const API = "/api/ogp.php";

export async function checkUrl(url) {
  if (MOCK) return mock(url);
  let res;
  try {
    res = await fetch(`${API}?url=${encodeURIComponent(url)}`, { headers: { Accept: "application/json" } });
  } catch (e) {
    throw new Error("通信できませんでした。時間をおいて、もう一度お試しください。");
  }
  let j = null;
  try { j = await res.json(); } catch (e) {}
  if (!j || !j.ok) throw new Error((j && j.error) || "ページを取得できませんでした。URLを確かめて、もう一度お試しください。");
  return analyze(j);
}

/* サンプルは本番の JS に含めないよう、モックのときだけ読み込む */
async function mock(url) {
  const { default: SAMPLES } = await import("../data/ogp-samples.js");
  const norm = url.replace(/\/+$/, "");
  const found = SAMPLES[url] || SAMPLES[norm] || Object.values(SAMPLES).find((s) => url.includes(s.domain));
  if (found) return new Promise((r) => setTimeout(() => r(found), 500));
  const base = SAMPLES["https://github.com"];
  return new Promise((r) => setTimeout(() => r({ ...base, url, domain: url.replace(/^https?:\/\//, "").split("/")[0] }), 500));
}

/* ---------- 採点 ---------- */
const esc = (s) => String(s || "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
const len = (s) => [...String(s || "")].length;

export function analyze(j) {
  const m = j.meta || {};
  const pageUrl = j.finalUrl || j.url;
  let host = "";
  try { host = new URL(pageUrl).hostname.replace(/^www\./, ""); } catch (e) {}
  const abs = (u) => { try { return u ? new URL(u, pageUrl).href : ""; } catch (e) { return ""; } };

  const ogTitle = m["og:title"] || "";
  const ogDesc = m["og:description"] || "";
  const ogImageRaw = m["og:image"] || m["og:image:url"] || "";
  const ogImage = abs(ogImageRaw);
  const title = j.title || "";
  const desc = m["description"] || "";
  const canonical = j.canonical ? abs(j.canonical) : "";

  const issues = [];
  let penalty = 0;
  const add = (level, t, d, code, cost, current) => { issues.push({ level, title: t, desc: d, code, current }); penalty += cost; };

  if (!ogTitle) add("err", "og:title が未設定です", "シェアされたときに、タイトルが正しく表示されません。", `<meta property="og:title" content="${esc(title || "ページのタイトル")}">`, 20);
  else if (len(ogTitle) > 60) add("warn", `og:title が長めです（${len(ogTitle)}文字）`, "60文字を超えると、SNSによっては途中で切れて表示されます。", `<meta property="og:title" content="${esc([...ogTitle].slice(0, 60).join(""))}">`, 3, `<meta property="og:title" content="${esc(ogTitle)}">`);

  if (!ogDesc) add("err", "og:description が未設定です", "シェアカードに説明文が出ず、内容が伝わりにくくなります。", `<meta property="og:description" content="${esc(desc || "ページの要約文")}">`, 15);
  else if (len(ogDesc) > 120) add("warn", `og:description が長すぎます（${len(ogDesc)}文字）`, "120文字以内を推奨します。SNSによっては途中で省略されます。", `<meta property="og:description" content="${esc([...ogDesc].slice(0, 110).join(""))}…">`, 5, `<meta property="og:description" content="${esc(ogDesc)}">`);

  if (!ogImageRaw) add("err", "og:image が未設定です", "画像がないとシェアカードが目立たず、クリックされにくくなります。1200×630pxの画像を推奨します。", `<meta property="og:image" content="https://${host || "example.com"}/ogp.png">\n<meta property="og:image:width" content="1200">\n<meta property="og:image:height" content="630">`, 20);
  else if (!/^https?:\/\//i.test(ogImageRaw)) add("err", "og:image が相対パスです", "多くのSNSは相対パスの画像を読み込めません。https:// から始まる絶対URLにしてください。", `<meta property="og:image" content="${esc(ogImage)}">`, 15, `<meta property="og:image" content="${esc(ogImageRaw)}">`);
  else if (!m["og:image:width"] || !m["og:image:height"]) add("info", "og:image:width / og:image:height が未設定です", "サイズを明示すると、初めてシェアされたときの表示崩れを防げます。", `<meta property="og:image:width" content="1200">\n<meta property="og:image:height" content="630">`, 2);

  if (!m["twitter:card"]) add("err", "twitter:card が未設定です", "X（旧Twitter）で大きな画像カードを出すには summary_large_image を指定します。", `<meta name="twitter:card" content="summary_large_image">`, 10);
  if (!m["og:url"]) add("warn", "og:url が未設定です", "シェアされたURLを1つにまとめるため、正規のURLを指定します。", `<meta property="og:url" content="${esc(canonical || pageUrl)}">`, 5);
  if (!canonical) add("warn", "canonical が未設定です", "同じ内容が複数のURLで見られる場合に、検索エンジンの評価が分散します。", `<link rel="canonical" href="${esc(pageUrl)}">`, 5);
  if (!m["og:site_name"]) add("warn", "og:site_name が未設定です", "サイト名がカードに出ないSNSがあります。", `<meta property="og:site_name" content="${esc(host)}">`, 3);
  if (!m["og:type"]) add("warn", "og:type が未設定です", "トップページは website、記事は article を指定します。", `<meta property="og:type" content="website">`, 3);

  const st = (v, lv = "err") => (v ? "ok" : lv);
  const fb = (v, of) => (v ? { value: v, state: "ok" } : { value: `未設定（${of} を使用）`, state: "info" });
  const tags = [
    { key: "og:title", value: ogTitle || "未設定", state: st(ogTitle) },
    { key: "og:description", value: ogDesc || "未設定", state: !ogDesc ? "err" : len(ogDesc) > 120 ? "warn" : "ok" },
    { key: "og:image", value: ogImageRaw || "未設定", state: st(ogImageRaw && /^https?:\/\//i.test(ogImageRaw)) },
    { key: "og:image:width", value: m["og:image:width"] || "未設定", state: st(m["og:image:width"], "info") },
    { key: "og:image:height", value: m["og:image:height"] || "未設定", state: st(m["og:image:height"], "info") },
    { key: "og:site_name", value: m["og:site_name"] || "未設定", state: st(m["og:site_name"], "warn") },
    { key: "og:type", value: m["og:type"] || "未設定", state: st(m["og:type"], "warn") },
    { key: "og:url", value: m["og:url"] || "未設定", state: st(m["og:url"], "warn") },
    { key: "twitter:card", value: m["twitter:card"] || "未設定", state: st(m["twitter:card"]) },
    { key: "twitter:title", ...fb(m["twitter:title"], "og:title") },
    { key: "twitter:description", ...fb(m["twitter:description"], "og:description") },
    { key: "twitter:image", ...fb(m["twitter:image"], "og:image") },
    { key: "canonical", value: canonical || "未設定", state: st(canonical, "warn") },
  ];

  const score = Math.max(0, Math.min(100, 100 - penalty));
  const status = score >= 90 ? "優秀" : score >= 80 ? "良好" : score >= 50 ? "要確認" : "要改善";
  const statusNote = score >= 90 ? "OGPタグが過不足なく設定されています" : score >= 80 ? "主要なOGPタグは設定されています" : score >= 50 ? "いくつか直すところがあります" : "主要なOGPタグが不足しています";

  return {
    url: pageUrl,
    score, status, statusNote,
    siteName: m["og:site_name"] || host,
    previewTitle: ogTitle || m["twitter:title"] || title,
    previewDesc: ogDesc || m["twitter:description"] || desc,
    image: ogImage ? "url" : "none",
    imageUrl: ogImage,
    domain: host,
    tags,
    issues,
  };
}
