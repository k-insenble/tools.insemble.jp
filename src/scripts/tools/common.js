/* ===========================================================
   端末内ツールの共通の動き（src/layouts/ToolPage.astro のページで使う）
   コピー・ダウンロード・お知らせ・−／＋の数字欄・画像の書き出し
   =========================================================== */
import "../site.js";
import "../faq.js";
import { svg } from "../../lib/icons.js";

export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
/* あとから差し込む HTML に、入力された値を入れるときは必ず通す */
export const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
export { svg };

export const reduceMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/* 今日の日付（ファイル名用）20261001 */
export const stamp = () => {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
};
/* ファイル名に使えない文字を落とす */
export const safeName = (s, fallback = "file") => String(s || "").replace(/[\\/:*?"<>|\u0000-\u001f]/g, "").replace(/\s+/g, " ").trim().slice(0, 80) || fallback;

export function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

/* ボタンの文言を少しのあいだ「〜しました」に変える */
export function flash(btn, text = "コピーしました") {
  if (!btn) return;
  if (!btn._html) btn._html = btn.innerHTML;
  btn.innerHTML = `<span class="copied-ic">${svg("check", 15)}</span>${esc(text)}`;
  clearTimeout(btn._t);
  btn._t = setTimeout(() => { btn.innerHTML = btn._html; btn._html = null; }, 1500);
}

export async function copyText(text, btn) {
  try {
    await navigator.clipboard.writeText(text);
  } catch (e) {
    // 古いブラウザや、許可がないとき
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.cssText = "position:fixed;top:-1000px;opacity:0";
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand("copy"); } catch (e2) {}
    ta.remove();
    if (!ok) { flash(btn, "コピーできませんでした"); return false; }
  }
  flash(btn);
  return true;
}

/* お知らせ（kind: err / warn / ok / info）。msgs に並べて出す。空の配列で消える */
const MSG_IC = { err: "warn", warn: "warn", ok: "check", info: "info" };
export function showMsgs(box, list) {
  if (!box) return;
  box.innerHTML = list.map(([kind, text]) => `<p class="msg ${kind}" role="${kind === "err" ? "alert" : "status"}">${svg(MSG_IC[kind] || "info", 15)}<span>${esc(text)}</span></p>`).join("");
}

/* −／＋ つきの数字欄：<div class="stepper" data-stepper><button data-step="-1">…<input type="number" min max>…<button data-step="1"> */
export function stepper(root, onChange) {
  const input = $("input", root);
  const min = () => Number(input.min || 1);
  const max = () => Number(input.max || 999);
  const clamp = (v) => Math.min(max(), Math.max(min(), Math.round(Number.isFinite(v) ? v : min())));
  const set = (v, fire = true) => { input.value = String(clamp(v)); if (fire) onChange?.(Number(input.value)); };
  $$("[data-step]", root).forEach((b) => b.addEventListener("click", () => set(Number(input.value) + Number(b.dataset.step))));
  input.addEventListener("change", () => set(Number(input.value)));
  return { get: () => clamp(Number(input.value)), set };
}

/* 押しボタン型の選択肢：<div class="pick" data-pick="name"><button data-v="a" aria-pressed="true"> */
export function picker(root, onChange) {
  const btns = $$("button[data-v]", root);
  const set = (v, fire = true) => {
    btns.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === v)));
    if (fire) onChange?.(v);
  };
  btns.forEach((b) => b.addEventListener("click", () => set(b.dataset.v)));
  return { get: () => (btns.find((b) => b.getAttribute("aria-pressed") === "true") || btns[0]).dataset.v, set };
}

export const canvasToBlob = (canvas, type = "image/png", quality) =>
  new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("画像を作れませんでした"))), type, quality));

/* 画像の書き出し用：角丸の四角 */
export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
/* 幅に収まらない文字は … で切る */
export function fitText(ctx, text, maxW) {
  if (ctx.measureText(text).width <= maxW) return text;
  let s = text;
  while (s.length > 1 && ctx.measureText(s + "…").width > maxW) s = s.slice(0, -1);
  return s + "…";
}
export const FONT = '-apple-system, BlinkMacSystemFont, "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Noto Sans JP", "Yu Gothic UI", Meiryo, sans-serif';
/* 書き出す画像の色（CSS のトークンと同じ見た目の近似値） */
export const INK = { ink: "#1c2a33", ink2: "#3d4b53", muted: "#5e6970", line: "#dde2e5", paper: "#f3f5f6", primary: "#1f6f7c" };
export const HUES = ["#2c7f8f", "#3f9a64", "#c08a26", "#c8543f", "#8a5bb5", "#3f6fb8", "#7d9a33", "#c24f84"];

/* 入力欄のそばに、Ctrl(⌘)+Enter で実行 */
export function submitOnCtrlEnter(el, fn) {
  el?.addEventListener("keydown", (e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); fn(); } });
}

/* 結果が画面の外にあれば、見えるところまで送る（スマホで入力欄の下に結果が出るとき） */
export function reveal(el, offset = 84) {
  if (!el) return;
  const r = el.getBoundingClientRect();
  if (r.top < offset || r.top > window.innerHeight * 0.6) window.scrollTo({ top: r.top + window.scrollY - offset, behavior: reduceMotion() ? "auto" : "smooth" });
}
