/* ===========================================================
   コピーボタン：押すと「コピーしました」に変わり、少しして戻る
   copyBtn() は Astro（サーバー側）でも結果パネル（ブラウザ側）でも使う
   =========================================================== */
import { svg } from "../lib/icons.js";

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function copyBtn(text, label = "コピー", variant = "ghost") {
  const cls = variant === "solid" ? "btn btn-primary" : "btn btn-ghost";
  return `<button type="button" class="${cls}" style="gap:6px" data-copy="${esc(text)}" data-label="${esc(label)}">${svg("copy", 15)}${esc(label)}</button>`;
}

export function onCopy(btn) {
  navigator.clipboard?.writeText(btn.dataset.copy).then(() => {
    btn.innerHTML = `<span class="copied-ic">${svg("check", 15)}</span>コピーしました`;
    clearTimeout(btn._t);
    btn._t = setTimeout(() => { btn.innerHTML = svg("copy", 15) + esc(btn.dataset.label); }, 1400);
  }, () => {});
}
