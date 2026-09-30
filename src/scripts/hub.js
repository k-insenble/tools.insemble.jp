/* ===========================================================
   ツールハブ（React なし）
   URLで検索 / お気に入り・最近使った（このブラウザの中だけ）/ 一覧の絞り込み / 人気・新着
   =========================================================== */
import "./site.js";
import "./faq.js";
import { svg, toolSvg } from "../lib/icons.js";
import H from "../data/hub.js";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const bySlug = (s) => H.TOOLS.find((t) => t.slug === s);

/* ---------- 端末内の保存（お気に入り・最近使った） ---------- */
const load = (k) => { try { return JSON.parse(localStorage.getItem(k)) || []; } catch (e) { return []; } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
let favs = load("hub.favs");
let recent = load("hub.recent");

// URLは #url= で渡す（# から後ろはサーバーに送られないので、アクセスログに残らない）
const toolUrl = (t, url) => "/" + t.slug + "/" + (url ? "#url=" + encodeURIComponent(/^https?:\/\//i.test(url) ? url : "https://" + url) : "");
function remember(slug) {
  recent = [slug, ...recent.filter((x) => x !== slug)].slice(0, 8);
  save("hub.recent", recent);
}
function open(t, url) {
  if (!t || t.status !== "live") return;
  remember(t.slug);
  location.href = toolUrl(t, url);
}
// ツールへのリンクを押したら「最近使った」に入れる（遷移はリンクのまま）
document.addEventListener("click", (e) => {
  const a = e.target.closest("a[data-open]");
  if (a) remember(a.dataset.open);
});

/* ---------- お気に入り／最近使った ---------- */
function drawMy() {
  const f = favs.map(bySlug).filter(Boolean);
  const r = recent.filter((s) => !favs.includes(s)).map(bySlug).filter(Boolean).slice(0, 4);
  const row = (label, icon, items) => items.length ? `<div class="my-row">
      <span class="my-k">${toolSvg(icon, 14)}${label}</span>
      <div class="chips">${items.map((t) => `<a class="chip my-chip" href="/${t.slug}/" data-open="${t.slug}">${toolSvg(t.icon, 14)}${esc(t.name)}</a>`).join("")}</div>
    </div>` : "";
  $("#my-slot").innerHTML = f.length || r.length ? `<div class="my">${row("お気に入り", "star", f)}${row("最近使った", "clock", r)}</div>` : "";
}
function drawFavs() {
  $$("[data-fav]").forEach((b) => {
    const on = favs.includes(b.dataset.fav);
    b.classList.toggle("on", on);
    b.setAttribute("aria-pressed", on);
    b.setAttribute("aria-label", on ? "お気に入りから外す" : "お気に入りに追加");
  });
}
$$("[data-fav]").forEach((b) => b.addEventListener("click", () => {
  const s = b.dataset.fav;
  favs = favs.includes(s) ? favs.filter((x) => x !== s) : [s, ...favs];
  save("hub.favs", favs);
  drawFavs();
  drawMy();
}));

/* ---------- ヒーローの検索（URLを入れたら対応するツールへ） ---------- */
const form = $("#hub-search");
const input = $("input", form);
const err = $(".hub-err");
const note = $("[data-meta-note]");
const setErr = (msg) => { err.textContent = msg; err.hidden = !msg; note.hidden = !!msg; input.setAttribute("aria-invalid", !!msg); };
input.addEventListener("input", () => setErr(""));
form.addEventListener("submit", (e) => {
  e.preventDefault();
  const u = input.value.trim();
  if (!(/^https?:\/\//i.test(u) || /^[\w-]+(\.[\w-]+)+(\/|$)/.test(u))) return setErr("URLの形で入力してください（例：https://example.com）");
  setErr("");
  const url = /^https?:\/\//i.test(u) ? u : "https://" + u;
  const live = H.TOOLS.filter((t) => t.url && t.status === "live");
  if (live.length === 1) return open(live[0], url);
  drawSuggest(url);
});

/* URLで使えるツールが2つ以上になったら、どれで開くかを選ばせる */
function drawSuggest(url) {
  const slot = $("#suggest-slot");
  const rows = H.TOOLS.filter((t) => t.url).map((t) => t.status === "soon"
    ? `<a class="s-row soon" aria-disabled="true"><span class="s-ic">${toolSvg(t.icon, 18)}</span><span class="s-name">${esc(t.name)}</span><span class="lbl">準備中</span></a>`
    : `<a class="s-row" href="${esc(toolUrl(t, url))}" data-open="${t.slug}"><span class="s-ic">${toolSvg(t.icon, 18)}</span><span class="s-name">${esc(t.name)}</span><span class="s-go">このURLで開く</span>${svg("arrow", 16)}</a>`).join("");
  slot.innerHTML = `<div class="suggest">
    <div class="suggest-head">
      <span class="suggest-k">${svg("bolt", 14)}このURLで使えるツール</span>
      <code class="suggest-url">${esc(url)}</code>
      <button type="button" class="hub-clear" aria-label="閉じる" data-close>${svg("x", 16)}</button>
    </div>
    <div class="suggest-rows">${rows}</div>
  </div>`;
  $("[data-close]", slot).addEventListener("click", () => { slot.innerHTML = ""; });
}

/* ---------- 人気ランキング／新着（公開中が3つ以上のときだけタブが出る） ---------- */
$$("[data-feat]").forEach((b) => b.addEventListener("click", () => {
  $$("[data-feat]").forEach((x) => { const on = x === b; x.classList.toggle("on", on); x.setAttribute("aria-selected", on); });
  $$("[data-feat-list]").forEach((l) => { l.hidden = l.dataset.featList !== b.dataset.feat; });
}));

/* ---------- カタログの絞り込み ---------- */
const q = $("#cat-q");
const clear = $("#cat-clear");
const secs = $$("[data-cat-sec]");
let cat = "all";
function filter() {
  const term = q.value.trim().toLowerCase();
  clear.hidden = !q.value;
  let first = true, hits = 0;
  secs.forEach((sec) => {
    let n = 0;
    $$(".t-row", sec).forEach((r) => {
      const ok = (cat === "all" || sec.dataset.catSec === cat) && (!term || r.dataset.search.includes(term));
      r.hidden = !ok;
      if (ok) n++;
    });
    sec.hidden = !n;
    $(".cat-n", sec).textContent = n;
    sec.style.marginTop = n && first ? "0" : ""; // 見えている先頭のカテゴリは上の余白なし
    if (n) first = false;
    hits += n;
  });
  $("#no-hit").hidden = hits > 0;
  $("#no-hit-q").textContent = q.value;
}
q.addEventListener("input", filter);
clear.addEventListener("click", () => { q.value = ""; filter(); q.focus(); });
$$("button[data-cat]").forEach((b) => b.addEventListener("click", () => {
  cat = b.dataset.cat;
  $$("button[data-cat]").forEach((x) => x.classList.toggle("on", x === b));
  filter();
}));
$("#no-hit-clear").addEventListener("click", () => {
  q.value = "";
  cat = "all";
  $$("button[data-cat]").forEach((x) => x.classList.toggle("on", x.dataset.cat === "all"));
  filter();
});

/* ---------- 起動 ---------- */
drawFavs();
drawMy();
