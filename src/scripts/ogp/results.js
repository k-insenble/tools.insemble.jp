/* ===========================================================
   結果パネル（React なし）— スコア / 直すところ / プレビュー / タグ / コード / シェア
   HTML を文字列で組み立てて差し込み、クリックは親要素でまとめて受ける。
   値はチェックしたページから来るので、HTML に入れる前に必ず esc() を通す。
   =========================================================== */
import { svg } from "../../lib/icons.js";
import { PLATFORMS, FRAMEWORKS, frameworkCode } from "../../lib/ogp-code.js";
import { copyBtn, onCopy } from "../copy.js";

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const httpUrl = (u) => (/^https?:\/\//i.test(u || "") ? u : "");
const tone = (score) => (score >= 80 ? "ok" : score >= 50 ? "warn" : "err");

/* --- スコアリング（数字と円を 0 から伸ばす） --- */
const R = 40, C = 2 * Math.PI * R;
function scoreRing(value) {
  const stops = value >= 80
    ? ["oklch(0.7 0.14 152)", "oklch(0.58 0.14 152)"]
    : value >= 50
    ? ["oklch(0.78 0.14 75)", "oklch(0.68 0.14 60)"]
    : ["oklch(0.68 0.19 32)", "oklch(0.56 0.19 22)"];
  const gid = "grad" + value;
  return `<div role="img" aria-label="スコア ${value} / 100" style="position:relative;width:92px;height:92px;flex-shrink:0;animation:pop .6s cubic-bezier(.2,.8,.3,1.2) both">
    <svg width="92" height="92" style="transform:rotate(-90deg);overflow:visible" aria-hidden="true">
      <defs><linearGradient id="${gid}" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${stops[0]}"/><stop offset="100%" stop-color="${stops[1]}"/></linearGradient></defs>
      <circle cx="46" cy="46" r="${R}" fill="none" stroke="var(--line)" stroke-width="8"/>
      <circle cx="46" cy="46" r="${R}" fill="none" stroke="var(--line-2)" stroke-width="8" stroke-dasharray="1 7" stroke-linecap="round" opacity="0.5"/>
      <circle data-ring cx="46" cy="46" r="${R}" fill="none" stroke="url(#${gid})" stroke-width="8" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C}"
        style="transition:stroke-dashoffset .6s cubic-bezier(.3,1,.4,1);filter:drop-shadow(0 2px 5px var(--${tone(value)}))"/>
    </svg>
    <div aria-hidden="true" style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center">
      <span data-num style="font-family:var(--font-display);font-weight:800;font-size:31.28px;line-height:1;color:var(--ink)">0</span>
      <span style="font-size:11px;color:var(--muted);margin-top:2px">/ 100</span>
    </div>
  </div>`;
}
function animateScore(root, value) {
  const ring = root.querySelector("[data-ring]");
  const num = root.querySelector("[data-num]");
  const show = (v) => { num.textContent = v; ring.setAttribute("stroke-dashoffset", C - (C * v) / 100); };
  const dur = 800;
  let start;
  const step = (t) => {
    start ??= t;
    const p = Math.min(1, (t - start) / dur);
    show(Math.round(value * (1 - Math.pow(1 - p, 3))));
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
  setTimeout(() => show(value), dur + 120); // タブが裏にあって rAF が止まっても最終値にする
}

/* --- og:image（画像がないとき・開発用サンプルの合成画像も） --- */
const THEMES = {
  github: { bg: "linear-gradient(135deg,#1f2430,#3a2740 70%)", accent: "#f78166" },
  qiita: { bg: "linear-gradient(135deg,#0f3d2e,#12664a)", accent: "#7fe7b8" },
  insemble: { bg: "linear-gradient(135deg,oklch(0.30 0.05 215),oklch(0.42 0.08 200) 75%)", accent: "oklch(0.85 0.08 190)" },
};
const IMG_BOX = "aspect-ratio:1200/630;width:100%;display:flex;align-items:center;justify-content:center;color:var(--muted);font-family:var(--font-mono);font-size:12px;letter-spacing:.02em";
function ogpImage(d) {
  const src = httpUrl(d.imageUrl);
  if (src) return `<img src="${esc(src)}" alt="" loading="lazy" referrerpolicy="no-referrer" data-ogimg style="aspect-ratio:1200/630;width:100%;object-fit:cover;display:block;background:var(--paper)">`;
  if (d.image === "none" || !THEMES[d.image]) {
    return `<div style="${IMG_BOX};background:repeating-linear-gradient(135deg,var(--paper) 0 12px,var(--bg) 12px 24px);border-bottom:1px solid var(--line)">OGP画像が未設定</div>`;
  }
  const th = THEMES[d.image];
  const text = (d.imgText || "The future of building\nhappens together").split("\n").map(esc).join("<br>");
  return `<div style="aspect-ratio:1200/630;width:100%;position:relative;overflow:hidden;background:${th.bg};color:#fff;display:flex;flex-direction:column;justify-content:center;padding:0 9%">
    <div style="position:absolute;right:-40px;top:-40px;width:180px;height:180px;border-radius:99px;background:${th.accent};opacity:.18;filter:blur(8px)"></div>
    <div style="position:absolute;left:12%;bottom:-30%;width:220px;height:220px;border-radius:99px;border:2px solid ${th.accent};opacity:.25"></div>
    <div style="font-size:clamp(11px,2.4cqw,15px);letter-spacing:.14em;text-transform:uppercase;opacity:.7;margin-bottom:.4em;font-weight:600">${esc(d.siteName)}</div>
    <div style="font-family:var(--font-display);font-weight:800;font-size:clamp(18px,5.2cqw,34px);line-height:1.25;max-width:90%">${text}</div>
  </div>`;
}
/* 画像が読み込めなかったとき（個人版から） */
function onImgError(img) {
  img.outerHTML = `<div style="${IMG_BOX};background:var(--paper)">画像を読み込めませんでした</div>`;
}

/* --- プラットフォーム別プレビュー --- */
function previewCard(p, d) {
  const title = esc(d.previewTitle || "（タイトルなし）");
  const desc = esc(d.previewDesc || "（説明文なし）");
  const head = `<div style="display:flex;align-items:center;gap:9px;margin-bottom:12px">
    <span aria-hidden="true" style="width:24px;height:24px;border-radius:7px;background:${p.color};color:#fff;display:grid;place-items:center;font-size:13px;font-weight:700;font-family:var(--font-display)">${p.glyph}</span>
    <span style="font-size:13px;font-weight:700;color:var(--ink)">${p.name}</span>
  </div>`;
  // X / Facebook / LINE：大きな画像カード
  if (["x", "facebook", "line"].includes(p.id)) {
    return `<div>${head}<div class="cq" style="border:1px solid var(--line);border-radius:14px;overflow:hidden;background:#fff">
      ${ogpImage(d)}
      <div style="padding:11px 14px 13px">
        <div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.03em">${esc(d.domain)}</div>
        <div class="clamp2" style="font-size:14px;font-weight:700;color:var(--ink);margin:3px 0 4px;line-height:1.4">${title}</div>
        <div class="clamp2" style="font-size:12.5px;color:var(--muted);line-height:1.55">${desc}</div>
      </div>
    </div></div>`;
  }
  // Slack / Discord / Teams：左ボーダーの引用風
  return `<div>${head}<div style="background:#fff;border:1px solid var(--line);border-left:3px solid ${p.color};border-radius:4px 12px 12px 4px;padding:12px 14px">
    <div style="font-size:11.5px;color:var(--muted);margin-bottom:4px">${esc(d.siteName)} · ${esc(d.domain)}</div>
    <div class="clamp2" style="font-size:14px;font-weight:700;color:${p.color};margin-bottom:4px;line-height:1.4">${title}</div>
    <div class="clamp3" style="font-size:12.5px;color:var(--muted);line-height:1.55;margin-bottom:10px">${desc}</div>
    <div class="cq" style="border-radius:10px;overflow:hidden;max-width:360px;border:1px solid var(--line)">${ogpImage(d)}</div>
  </div></div>`;
}
function previewTab(d, s) {
  const seg = [["sns", "SNS"], ["chat", "チャットツール"]]
    .map(([k, l]) => `<button type="button" class="seg-btn${s.grp === k ? " on" : ""}" data-grp="${k}" aria-pressed="${s.grp === k}">${l}</button>`).join("");
  return `<div class="seg" style="margin-bottom:18px">${seg}</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:22px">${PLATFORMS[s.grp].map((p) => previewCard(p, d)).join("")}</div>`;
}

/* --- タグ一覧 --- */
const DOT = { ok: "var(--ok)", warn: "var(--warn)", err: "var(--err)", info: "var(--muted)" };
function tagsTab(d) {
  const rows = d.tags.map((t) => `<div class="tag-row">
    <code class="tag-key"><span aria-hidden="true" style="width:7px;height:7px;border-radius:99px;background:${DOT[t.state] || DOT.info};flex-shrink:0"></span>${esc(t.key)}</code>
    <div class="tag-val${t.value === "未設定" ? " empty" : ""}">${esc(t.value)}</div>
  </div>`).join("");
  return `<p class="hint">取得したタグの値と、設定の状態を一覧で確認できます。</p><div class="tag-table">${rows}</div>`;
}

/* --- 直すところ --- */
const LEVEL = {
  err: { bg: "var(--err-bg)", fg: "var(--err)", label: "必ず直す", icon: "warn", tip: "直さないと、シェアしたときに画像やタイトルが出ないなど、見え方がはっきり崩れます。" },
  warn: { bg: "var(--warn-bg)", fg: "var(--warn-ink)", label: "直すと良い", icon: "warn", tip: "今も表示はされますが、SNSによって文字が切れたり、見え方がばらついたりします。" },
  info: { bg: "var(--info-bg)", fg: "var(--info)", label: "余裕があれば", icon: "info", tip: "直さなくても見え方はほぼ変わりません。より確実に表示させたいときの設定です。" },
};
const ORDER = { err: 0, warn: 1, info: 2 };
const sortedIssues = (d) => [...d.issues].sort((a, b) => ORDER[a.level] - ORDER[b.level]);
function issuesTab(d) {
  if (!d.issues.length) {
    return `<div class="empty-good">
      <div style="width:46px;height:46px;border-radius:99px;background:var(--ok-bg);color:var(--ok);display:grid;place-items:center;margin:0 auto 12px">${svg("check", 26)}</div>
      <div style="font-weight:700;font-family:var(--font-display);font-size:17px;color:var(--ink)">直すところはありません</div>
      <p style="color:var(--muted);font-size:13.5px;margin-top:6px">主要なOGPタグが過不足なく設定されています。プレビューで見え方も確認しておきましょう。</p>
    </div>`;
  }
  const list = sortedIssues(d);
  const items = list.map((is, i) => {
    const m = LEVEL[is.level];
    return `<li class="fix">
      <div class="fix-top">
        <span class="fix-n">${i + 1}</span>
        <span class="issue-badge tip" style="color:${m.fg};background:${m.bg}" tabindex="0" data-tip="${m.tip}" aria-label="${m.label}：${m.tip}">${svg(m.icon, 13)}${m.label}<span class="tip-q" aria-hidden="true">?</span></span>
        <span class="fix-title">${esc(is.title)}</span>
        ${copyBtn(is.code)}
      </div>
      <p class="fix-desc">${esc(is.desc)}</p>
      ${is.current ? `<details class="fix-cur"><summary>いまのコードを見る</summary><pre class="code-block subtle"><code>${esc(is.current)}</code></pre></details>` : ""}
      <pre class="code-block dark fix-code"><code>${esc(is.code)}</code></pre>
    </li>`;
  }).join("");
  return `<div class="fix-head">
      <div>
        <div class="fix-t">直すところ <b>${list.length}</b>件</div>
        <p class="fix-d">「必ず直す」から順に直すのがおすすめです。コードを <code>&lt;head&gt;</code> 内に貼り付けてください。ラベルにカーソルを合わせる（スマホはタップ）と、意味が出ます。</p>
      </div>
      ${copyBtn(list.map((i) => i.code).join("\n"), "修正コードをまとめてコピー", "solid")}
    </div>
    <ol class="fix-list">${items}</ol>
    <p class="fix-more">Next.js や WordPress などを使っている場合は、<button type="button" data-tab="code">コード</button>のタブで書き方を切り替えられます。</p>`;
}

/* --- フレームワーク別コード --- */
function codeTab(d, s) {
  const code = frameworkCode(s.fw, d);
  const chips = FRAMEWORKS.map((f) => `<button type="button" class="chip${s.fw === f ? " on" : ""}" data-fw="${f}" aria-pressed="${s.fw === f}">${f}</button>`).join("");
  return `<p class="hint">使っているフレームワークを選ぶと、コピーして使えるコードが生成されます。</p>
    <div class="chips" style="margin-bottom:14px">${chips}</div>
    <div class="editor">
      <div class="editor-bar">
        <div style="display:flex;gap:6px" aria-hidden="true"><span class="dot" style="background:#ff5f57"></span><span class="dot" style="background:#febc2e"></span><span class="dot" style="background:#28c840"></span></div>
        <span style="font-family:var(--font-mono);font-size:11.5px;color:rgba(255,255,255,.5)">${s.fw}</span>
        ${copyBtn(code)}
      </div>
      <pre class="code-block dark editor-body"><code>${esc(code)}</code></pre>
    </div>`;
}

/* --- 結果をシェア --- */
const TOOL = "https://tools.insemble.jp/ogp";
function shareBar(d) {
  const link = `${TOOL}/#url=${encodeURIComponent(d.url)}`; // # で渡すと、開いた人のURLもサーバーのログに残らない
  const text = `「${d.domain}」のOGPスコアは${d.score}点！SNSでの見え方を無料でチェックできます`;
  const enc = encodeURIComponent;
  const targets = [
    { name: "Xでポスト", color: "#0f1419", glyph: "𝕏", href: `https://twitter.com/intent/tweet?text=${enc(text)}&url=${enc(link)}&hashtags=OGPチェッカー` },
    { name: "LINEで送る", color: "#06c755", glyph: "L", href: `https://social-plugins.line.me/lineit/share?url=${enc(link)}&text=${enc(text)}` },
    { name: "Facebook", color: "#1877f2", glyph: "f", href: `https://www.facebook.com/sharer/sharer.php?u=${enc(link)}` },
  ];
  const btns = targets.map((t) => `<a class="share-btn" href="${esc(t.href)}" target="_blank" rel="noopener noreferrer" style="--b:${t.color}"><span class="share-glyph" aria-hidden="true" style="background:${t.color}">${t.glyph}</span>${t.name}</a>`).join("");
  const native = navigator.share
    ? `<button type="button" class="share-btn ghost" data-share="${esc(link)}" data-text="${esc(text)}"><span class="share-glyph ghost">${svg("arrow", 15)}</span>その他で共有</button>`
    : "";
  return `<div class="share reveal">
    <div class="share-deco" aria-hidden="true">
      <i style="left:8%;top:26%;background:var(--primary);opacity:.4"></i>
      <i style="left:92%;top:30%;background:#06c755;opacity:.35"></i>
      <i style="left:16%;top:74%;border:2px solid var(--primary);opacity:.3"></i>
    </div>
    <div class="share-copy">
      <div class="share-emoji" aria-hidden="true">📣</div>
      <div>
        <h2 class="share-h">この結果をシェアしよう</h2>
        <p class="share-sub">スコアやプレビューを、SNSやLINEでそのままシェア。<br class="dt">このツールを友だちに教えるのにも使えます。</p>
      </div>
    </div>
    <div class="share-actions">
      ${btns}
      <button type="button" class="share-btn ghost" data-copy-link="${esc(link)}"><span class="share-glyph ghost">${svg("link", 15)}</span><span>リンクをコピー</span></button>
      ${native}
    </div>
  </div>`;
}

/* --- 結果パネル（不足があれば「直すところ」から開く） --- */
const TABS = [
  { k: "issues", label: "直すところ", icon: "sparkle" },
  { k: "preview", label: "プレビュー", icon: "eye" },
  { k: "tags", label: "タグ一覧", icon: "list" },
  { k: "code", label: "コード", icon: "code" },
];

export function renderResults(root, d) {
  const n = d.issues.length;
  const s = { tab: n ? "issues" : "preview", grp: "sns", fw: "HTML" };
  const t = tone(d.score);
  const worst = d.issues.some((i) => i.level === "err") ? "err" : d.issues.some((i) => i.level === "warn") ? "warn" : "info";
  const allFix = sortedIssues(d).map((i) => i.code).join("\n");

  const tabBtn = (x) => {
    const alert = x.k === "issues" && n;
    const badge = x.k === "issues" ? n || "" : x.k === "tags" ? d.tags.length : "";
    return `<button type="button" role="tab" id="rtab-${x.k}" aria-controls="rtab-body" data-tab="${x.k}" class="rtab${alert ? " alert " + worst : ""}">
      ${svg(x.icon, 16)}${x.label}${badge ? `<span class="rtab-badge${alert ? " hot" : ""}">${badge}</span>` : ""}
    </button>`;
  };

  root.innerHTML = `<div class="results" id="results">
      <div class="score-head">
        ${scoreRing(d.score)}
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
            <span class="status-pill ${t}">${esc(d.status)}</span>
            <span style="font-family:var(--font-mono);font-size:12.5px;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(d.url)}</span>
          </div>
          <h2 style="font-family:var(--font-display);font-weight:800;font-size:20px;color:var(--ink);margin:8px 0 3px">${esc(d.statusNote)}</h2>
          <p style="font-size:13px;color:var(--muted);margin:0">${n
            ? `<button type="button" class="issue-jump ${worst}" data-tab="issues">${svg("sparkle", 14)}直すところが<b>${n}件</b>あります</button>`
            : "直すところはありません"}</p>
        </div>
        ${n ? `<div class="score-actions">${copyBtn(allFix, "修正コードをまとめてコピー", "solid")}</div>` : ""}
      </div>
      <div class="rtabs" role="tablist" aria-label="結果の見かた">${TABS.map(tabBtn).join("")}</div>
      <div class="rtab-body" id="rtab-body" role="tabpanel" tabindex="0"></div>
    </div>
    ${shareBar(d)}`;

  const body = root.querySelector(".rtab-body");
  const draw = (animate = true) => {
    root.querySelectorAll(".rtab").forEach((b) => {
      const on = b.dataset.tab === s.tab;
      b.classList.toggle("on", on);
      b.setAttribute("aria-selected", on);
      b.tabIndex = on ? 0 : -1;
    });
    body.setAttribute("aria-labelledby", "rtab-" + s.tab);
    body.innerHTML = s.tab === "issues" ? issuesTab(d) : s.tab === "preview" ? previewTab(d, s) : s.tab === "tags" ? tagsTab(d) : codeTab(d, s);
    if (animate) { body.style.animation = "none"; void body.offsetHeight; body.style.animation = "tabIn .34s ease both"; }
  };

  root.onclick = (e) => {
    const el = e.target.closest("button");
    if (!el || !root.contains(el)) return;
    if (el.dataset.copy != null) return onCopy(el);
    if (el.dataset.tab) { s.tab = el.dataset.tab; return draw(); }
    if (el.dataset.grp) { s.grp = el.dataset.grp; return draw(false); }
    if (el.dataset.fw) { s.fw = el.dataset.fw; return draw(false); }
    if (el.dataset.copyLink) {
      navigator.clipboard?.writeText(el.dataset.copyLink).then(() => {
        const lbl = el.querySelector("span:last-child");
        el.querySelector(".share-glyph").innerHTML = svg("check", 15);
        lbl.textContent = "コピーしました";
        setTimeout(() => { el.querySelector(".share-glyph").innerHTML = svg("link", 15); lbl.textContent = "リンクをコピー"; }, 1500);
      }, () => {});
      return;
    }
    if (el.dataset.share) navigator.share({ title: "OGPチェッカー", text: el.dataset.text, url: el.dataset.share }).catch(() => {});
  };
  // タブは左右キーでも移動できるように
  root.querySelector(".rtabs").onkeydown = (e) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    const i = TABS.findIndex((x) => x.k === s.tab);
    s.tab = TABS[(i + (e.key === "ArrowRight" ? 1 : TABS.length - 1)) % TABS.length].k;
    draw();
    root.querySelector("#rtab-" + s.tab).focus();
  };
  // 画像の error はバブリングしないので、キャプチャで受ける（再チェックで重ねて登録しない）
  if (!root.dataset.imgErr) {
    root.dataset.imgErr = "1";
    root.addEventListener("error", (e) => { if (e.target.matches?.("img[data-ogimg]")) onImgError(e.target); }, true);
  }

  draw(false);
  animateScore(root, d.score);
}
