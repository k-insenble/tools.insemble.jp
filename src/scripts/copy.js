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

/* クリップボードに書けないブラウザ（許可がない・古い）では、昔ながらの方法で試す */
function fallbackCopy(text) {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.setAttribute("readonly", "");
  ta.style.cssText = "position:fixed;top:-1000px;opacity:0";
  document.body.appendChild(ta);
  ta.select();
  let ok = false;
  try { ok = document.execCommand("copy"); } catch (e) {}
  ta.remove();
  return ok;
}

export async function onCopy(btn) {
  const text = btn.dataset.copy;
  let ok = false;
  try { await navigator.clipboard.writeText(text); ok = true; } catch (e) { ok = fallbackCopy(text); }
  // 失敗したときも黙らない。ボタンの中に収まる長さで伝え、少し長めに出す
  btn.innerHTML = ok ? `<span class="copied-ic">${svg("check", 15)}</span>コピーしました` : "コピーできませんでした";
  clearTimeout(btn._t);
  btn._t = setTimeout(() => { btn.innerHTML = svg("copy", 15) + esc(btn.dataset.label); }, ok ? 1400 : 2600);
}
