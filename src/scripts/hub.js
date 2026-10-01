/* ===========================================================
   ツールハブ（React なし）
   ツールを探す（入力で絞り込み）/ お気に入り・最近使った（このブラウザの中だけ）
   =========================================================== */
import { goTo } from "./site.js";
import "./faq.js";
import { toolSvg } from "../lib/icons.js";
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

/* ---------- ヒーローの検索（ツールを探す専用。入れたそばから一覧を絞り込む） ---------- */
const form = $("#hub-search");
const input = $("input", form);
const clearBtn = $("#hub-clear");
const urlHint = $("#hub-url");
const urlLink = $("#hub-url-link");
const looksUrl = (u) => /^https?:\/\//i.test(u) || /^[\w-]+(\.[\w-]+)+(\/|$)/.test(u);
const urlTool = H.TOOLS.find((t) => t.url && t.status === "live");

function onInput() {
  const v = input.value.trim();
  clearBtn.hidden = !input.value;
  const isUrl = looksUrl(v);
  // URLを貼った人には、URLで使うツールへのリンクを出すだけ（押すかどうかは本人が決める）
  if (urlHint) {
    urlHint.hidden = !isUrl || !urlTool;
    if (isUrl && urlTool) urlLink.href = toolUrl(urlTool, v);
  }
  filter(isUrl ? "" : input.value);
}
input.addEventListener("input", onInput);
clearBtn.addEventListener("click", () => { input.value = ""; onInput(); input.focus(); });

// Enter：探した結果の場所へ送るだけ（スマホではキーボードを閉じる）
form.addEventListener("submit", (e) => {
  e.preventDefault();
  const v = input.value.trim();
  if (!v || looksUrl(v)) return;
  const { live, soon } = filter(v);
  input.blur();
  if (live) goTo("#tools");
  else if (soon) goTo("#catalog");
});

/* ---------- 一覧の絞り込み（いま使えるツール＋これから公開するツール） ---------- */
const liveRows = $$("#live-list [data-search]");
const soonBox = $("#soon-box");
const soonSecs = $$("[data-cat-sec]", soonBox);
let userOpen = soonBox.open; // 絞り込む前に、自分で開いていたか
soonBox.addEventListener("toggle", () => { if (!input.value.trim()) userOpen = soonBox.open; });

function filter(raw) {
  // 全角・半角をそろえ、空白で区切ったことばがすべて含まれるものを出す（例：「ＰＤＦ 画像」）
  const terms = String(raw || "").trim().normalize("NFKC").toLowerCase().split(/\s+/).filter(Boolean);
  const hit = (r) => terms.every((t) => r.dataset.search.includes(t));
  let live = 0, soon = 0;
  liveRows.forEach((r) => { const ok = hit(r); r.hidden = !ok; if (ok) live++; });
  soonSecs.forEach((sec) => {
    let n = 0;
    $$(".t-row", sec).forEach((r) => { const ok = hit(r); r.hidden = !ok; if (ok) n++; });
    sec.hidden = !n;
    $(".cat-n", sec).textContent = n;
    soon += n;
  });
  $("#live-n").textContent = live;
  $("#soon-n").textContent = soon;
  // 準備中だけに当たったときは、たたんでいる一覧を開いて見せる。ことばを消したら元に戻す
  soonBox.open = terms.length ? soon > 0 && live === 0 ? true : soonBox.open : userOpen;
  const box = $("#no-hit");
  box.hidden = !terms.length || live > 0;
  $("#no-hit-q").textContent = raw;
  $(".no-hit-t", box).lastChild.textContent = soon ? "」は、いま準備中です" : "」に合うツールが見つかりませんでした";
  $(".no-hit-d", box).textContent = soon ? "下の「これから公開するツール」にあります。公開まで、もうしばらくお待ちください。" : "ツールは順次ふやしています。別のことばでも探してみてください。";
  return { live, soon };
}
$("#no-hit-clear").addEventListener("click", () => { input.value = ""; onInput(); input.focus(); });

/* ---------- 起動 ---------- */
drawFavs();
drawMy();
