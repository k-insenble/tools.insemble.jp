/* ===========================================================
   OGPチェッカーのページ（React なし）
   入力・チェック・最近のURL・スクロール中の入力欄・用語集（FAQ は ../faq.js）
   取得と採点は src/lib/ogp.js、結果の表示は ./results.js
   =========================================================== */
import "../site.js";
import "../faq.js";
import { checkUrl } from "../../lib/ogp.js";
import { renderResults } from "./results.js";
import { onCopy } from "../copy.js";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/* ---------- 最近チェックしたURL（このブラウザの中だけに残す） ---------- */
const RECENT_KEY = "ogp.recent";
const loadRecent = () => { try { return JSON.parse(localStorage.getItem(RECENT_KEY)) || []; } catch (e) { return []; } };
const saveRecent = (list) => { try { localStorage.setItem(RECENT_KEY, JSON.stringify(list)); } catch (e) {} };
function drawRecent(list) {
  const box = $("#recent");
  box.hidden = !list.length;
  $(".chips", box).innerHTML = list.map((u) => `<button type="button" class="chip ghost" data-check-url="${esc(u)}">${esc(u.replace(/^https?:\/\//, ""))}</button>`).join("");
}

/* ---------- チェック ---------- */
const inputs = $$("[data-url-input]");
const buttons = $$("[data-check-btn]");
const slot = $("#results-slot");
const errBox = $("#tz-err");

function setLoading(on) {
  buttons.forEach((b) => {
    b.disabled = on;
    $(".spin", b).hidden = !on;
    $("[data-idle-ic]", b).hidden = on;
    const t = $("[data-label]", b);
    if (t) t.textContent = on ? t.dataset.busy : t.dataset.label;
  });
}

// 日本語ドメインは xn-- の形にして送る。ID・パスワード入りのURLは、履歴やシェア用リンクに残らないよう送る前に止める
function toFetchUrl(url) {
  let u;
  try { u = new URL(url); } catch (e) { throw new Error("URLの形が正しくありません。"); }
  if (u.username || u.password) throw new Error("IDやパスワードが入ったURLはチェックできません。IDやパスワードを含まないURLで、もう一度お試しください。");
  return u.href;
}

async function onCheck(url, scroll = true) {
  setLoading(true);
  errBox.hidden = true;
  try {
    const data = await checkUrl(toFetchUrl(url));
    renderResults(slot, data);
    slot.hidden = false;
    const list = [url, ...loadRecent().filter((x) => x !== url)].slice(0, 5);
    saveRecent(list);
    drawRecent(list);
    if (scroll) setTimeout(() => window.scrollTo({ top: slot.getBoundingClientRect().top + window.scrollY - 128, behavior: "smooth" }), 60);
  } catch (e) {
    $("span", errBox).textContent = e && e.message ? e.message : "ページを取得できませんでした。URLを確かめて、もう一度お試しください。";
    errBox.hidden = false;
    // 前の結果が残っていると「今回チェックできた」ように見えるので、エラーのあいだは隠す
    slot.hidden = true;
  } finally {
    setLoading(false);
  }
}

function submit(raw) {
  const u = (raw || "").trim();
  if (!u) return;
  const url = /^https?:\/\//i.test(u) ? u : "https://" + u;
  inputs.forEach((i) => { i.value = url; });
  onCheck(url);
}

$$("form[data-checker]").forEach((f) => f.addEventListener("submit", (e) => {
  e.preventDefault();
  submit($("[data-url-input]", f).value);
}));
// 上と下（スクロール中）の入力欄は同じ値にそろえる
inputs.forEach((i) => i.addEventListener("input", () => inputs.forEach((o) => { if (o !== i) o.value = i.value; })));
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-check-url]");
  if (b) submit(b.dataset.checkUrl);
});

/* ---------- スクロール中の小さな入力欄 ---------- */
const hero = $("#hero");
const mini = $(".minibar");
function toggleMini() {
  const show = hero.getBoundingClientRect().bottom < 64;
  if (mini.classList.contains("on") === show) return;
  mini.classList.toggle("on", show);
  mini.setAttribute("aria-hidden", !show);
  $$("input,button", mini).forEach((el) => { el.tabIndex = show ? 0 : -1; });
}
toggleMini();
window.addEventListener("scroll", toggleMini, { passive: true });

/* ---------- 用語集（絞り込み・開閉） ---------- */
(function glossary() {
  const rows = $$(".g-row");
  if (!rows.length) return;
  const q = $("#gloss-q");
  const empty = $("#gloss-empty");
  let cat = "すべて";
  const filter = () => {
    const term = q.value.trim().toLowerCase();
    let hits = 0;
    rows.forEach((r) => {
      const ok = (cat === "すべて" || r.dataset.cat === cat) && (!term || r.dataset.search.includes(term));
      r.hidden = !ok;
      if (ok) hits++;
    });
    empty.hidden = hits > 0;
  };
  q.addEventListener("input", filter);
  $$("[data-gloss-cat]").forEach((b) => b.addEventListener("click", () => {
    cat = b.dataset.glossCat;
    $$("[data-gloss-cat]").forEach((x) => x.classList.toggle("on", x === b));
    filter();
  }));
  const setOpen = (r, open) => {
    r.classList.toggle("open", open);
    $(".g-def-top", r).setAttribute("aria-expanded", open);
    $(".q-a-wrap", r).inert = !open;
  };
  rows.forEach((r) => {
    r.addEventListener("click", (e) => {
      if (e.target.closest(".g-detail")) return; // 開いた中身（コピーなど）のクリックでは閉じない
      const open = !r.classList.contains("open");
      rows.forEach((x) => { if (x !== r) setOpen(x, false); });
      setOpen(r, open);
    });
  });
  $$(".g-detail [data-copy]").forEach((b) => b.addEventListener("click", () => onCopy(b)));
})();

/* ---------- 起動 ---------- */
drawRecent(loadRecent());
// #url= で受け取る（ログに残らない）。前に配った ?url= のリンクも開けるように残す
const initialUrl = new URLSearchParams(location.hash.slice(1)).get("url") || new URLSearchParams(location.search).get("url");
if (initialUrl) {
  // 受け取ったらアドレスバーから外す（計測ツールにページのURLとして残らないように。utm_ などはそのまま）
  const here = new URL(location.href);
  here.hash = "";
  here.searchParams.delete("url");
  history.replaceState(null, "", here.pathname + here.search);
  inputs.forEach((i) => { i.value = initialUrl; });
  onCheck(initialUrl, false);
}
