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
    // ?url= で送るとサーバーのアクセスログに残るので、本文（POST）で送る
    res = await fetch(API, { method: "POST", headers: { Accept: "application/json" }, body: new URLSearchParams({ url }) });
  } catch (e) {
    throw new Error("サーバーにつながりませんでした。インターネットの接続を確かめて、少し時間をおいてからもう一度お試しください。");
  }
  let j = null;
  try { j = await res.json(); } catch (e) {}
  if (!j || !j.ok) throw new Error((j && j.error) || "ページを読み取れませんでした。URLに入力の誤りがないかを確かめて、もう一度お試しください。");
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

  if (!ogTitle) add("err", "og:title が未設定です", "シェアされたときに、カードのタイトルが思ったとおりに出ません。下のコードの content に、カードに出したいタイトルを入れて貼り付けてください。", `<meta property="og:title" content="${esc(title || "ページのタイトル")}">`, 20);
  else if (len(ogTitle) > 60) add("warn", `og:title が長めです（${len(ogTitle)}文字）`, "60文字を超えると、SNSによっては途中で切れます。下のコードは60文字で切っただけなので、文が自然に終わるよう整えてから使ってください。", `<meta property="og:title" content="${esc([...ogTitle].slice(0, 60).join(""))}">`, 3, `<meta property="og:title" content="${esc(ogTitle)}">`);

  if (!ogDesc) add("err", "og:description が未設定です", "カードに説明文が出ないため、どんなページかが伝わりにくくなります。下のコードの content に、ページの内容を120文字以内でまとめて入れてください。", `<meta property="og:description" content="${esc(desc || "ページの要約文")}">`, 15);
  else if (len(ogDesc) > 120) add("warn", `og:description が長すぎます（${len(ogDesc)}文字）`, "SNSによっては途中で省略されるため、120文字以内がおすすめです。下のコードは110文字で切っただけなので、文が自然に終わるよう整えてから使ってください。", `<meta property="og:description" content="${esc([...ogDesc].slice(0, 110).join(""))}…">`, 5, `<meta property="og:description" content="${esc(ogDesc)}">`);

  if (!ogImageRaw) add("err", "og:image が未設定です", "画像がないとカードが目立たず、クリックされにくくなります。1200×630pxの画像を用意して、下のコードの content をその画像のURLに書きかえてください。", `<meta property="og:image" content="https://${host || "example.com"}/ogp.png">\n<meta property="og:image:width" content="1200">\n<meta property="og:image:height" content="630">`, 20);
  else if (!/^https?:\/\//i.test(ogImageRaw)) add("err", "og:image が相対パスです", "多くのSNSは、https:// から始まらない書き方（相対パス）の画像を読み込めません。下のコードのように、https:// から始まるURLに直してください。", `<meta property="og:image" content="${esc(ogImage)}">`, 15, `<meta property="og:image" content="${esc(ogImageRaw)}">`);
  else if (!m["og:image:width"] || !m["og:image:height"]) add("info", "og:image:width / og:image:height が未設定です", "画像の幅と高さを書いておくと、初めてシェアされたときの表示崩れを防げます。下のコードは1200×630pxの場合です。画像の大きさが違うときは、数字を合わせてください。", `<meta property="og:image:width" content="1200">\n<meta property="og:image:height" content="630">`, 2);

  if (!m["twitter:card"]) add("err", "twitter:card が未設定です", "このままだと、X（旧Twitter）では画像のない簡単なカードで表示されます。画像を大きく出すには、summary_large_image を指定します。", `<meta name="twitter:card" content="summary_large_image">`, 10);
  if (!m["og:url"]) add("warn", "og:url が未設定です", "末尾に ?ref=… などが付いたURLでシェアされても同じページとしてまとまるよう、ページの正式なURLを指定します。", `<meta property="og:url" content="${esc(canonical || pageUrl)}">`, 5);
  if (!canonical) add("warn", "canonical が未設定です", "同じ内容のページが複数のURLで開けると、検索エンジンでの評価が分かれてしまいます。どれが正式なURLかを、このタグで伝えます。", `<link rel="canonical" href="${esc(pageUrl)}">`, 5);
  if (!m["og:site_name"]) add("warn", "og:site_name が未設定です", "このままだと、SNSによってはカードにサイト名が出ません。下のコードにはドメイン名を入れているので、サイト名に書きかえて使ってください。", `<meta property="og:site_name" content="${esc(host)}">`, 3);
  if (!m["og:type"]) add("warn", "og:type が未設定です", "ページの種類を伝えるタグです。下のコードは website にしているので、ブログなどの記事のページでは article に書きかえてください。", `<meta property="og:type" content="website">`, 3);

  const st = (v, lv = "err") => (v ? "ok" : lv);
  const fb = (v, of) => (v ? { value: v, state: "ok" } : { value: `未設定（${of} が使われます）`, state: "info" });
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

  // 「必ず直す」（err）が1つでも残っているうちは、80点未満（要確認）にとどめる。「優秀」と「必ず直す」が同時に出ないように
  const mustFix = issues.some((i) => i.level === "err");
  const score = Math.max(0, Math.min(mustFix ? 79 : 100, 100 - penalty));
  const status = score >= 90 ? "優秀" : score >= 80 ? "良好" : score >= 50 ? "要確認" : "要改善";
  const statusNote = !issues.length ? "OGPタグは過不足なく整っています" : score >= 90 ? "OGPタグはほぼ整っています" : score >= 80 ? "あと少しで整います" : score >= 50 ? (mustFix ? "必ず直すところがあります" : "いくつか直すところがあります") : "主要なOGPタグが足りていません";

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
