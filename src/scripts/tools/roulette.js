/* ===========================================================
   イベント用ルーレット（/roulette/）
   名前 → 回す → 止まった人を大きく表示 → 外して次へ／結果の一覧
   当たる人は回す前に乱数で決め、その人の枠で止まるように角度を計算する
   =========================================================== */
import { $, $$, esc, copyText, showMsgs, reduceMotion } from "./common.js";
import { parsePeople, randInt } from "../../lib/arrange.js";

const el = {
  title: $("#rl-title"),
  names: $("#rl-names"),
  count: $("#rl-names-count"),
  cands: $("#rl-cands"),
  candList: $("#rl-cand-list"),
  auto: $("#rl-auto"),
  msgs: $("#rl-msgs"),
  stage: $("#rl-stage"),
  what: $("#rl-what"),
  full: $("#rl-full"),
  wheel: $("#rl-wheel"),
  hub: $("#rl-hub"),
  left: $("#rl-left"),
  go: $("#rl-go"),
  result: $("#rl-result"),
  k: $("#rl-k"),
  win: $("#rl-win"),
  next: $("#rl-next"),
  close: $("#rl-close"),
  hist: $("#rl-hist"),
  histList: $("#rl-hist-list"),
  copy: $("#rl-copy"),
  restore: $("#rl-restore"),
  reset: $("#rl-reset"),
};

/* 枠の色（明るめ。文字は濃い色で読めるように） */
const FILLS = ["#d6ecef", "#fbe3c4", "#dcefd9", "#f6d6d2", "#e3dcf3", "#d7e3f5", "#eef0cf", "#f5d9e6"];

let people = [];        // [{ name }]（入力欄の順）
let off = new Set();    // 外した人（people の番号）
let history = [];       // [{ name }]
let rotation = 0;       // いまの角度（度）
let spinning = false;
let pending = null;     // 止まったあと、外す予定の人の番号

const remaining = () => people.map((p, i) => i).filter((i) => !off.has(i));

/* ---------- 入力 ---------- */
function readNames() {
  const prev = people.map((p) => p.name);
  const { people: list, warnings } = parsePeople(el.names.value);
  // 名前の欄を書き換えても、外した人はできるだけ外したままにする（同じ名前・同じ出現順で対応させる）
  const offNames = [...off].map((i) => prev[i]).filter(Boolean);
  const nextOff = new Set();
  const used = new Map();
  list.forEach((p, i) => {
    const want = offNames.filter((n) => n === p.name).length;
    const have = used.get(p.name) || 0;
    if (have < want) { nextOff.add(i); used.set(p.name, have + 1); }
  });
  people = list;
  off = nextOff;
  showMsgs(el.msgs, warnings.filter((w) => !w.startsWith("同じ名前")).map((w) => ["warn", w]));
  draw();
}

function drawCands() {
  el.count.textContent = `${people.length}人`;
  el.cands.hidden = people.length === 0 || (off.size === 0 && history.length === 0);
  el.candList.innerHTML = people.map((p, i) => `<button type="button" class="chip${off.has(i) ? " off" : ""}" data-i="${i}" aria-pressed="${!off.has(i)}">${esc(p.name)}</button>`).join("");
}

/* ---------- ルーレットを描く（SVG） ---------- */
function wheelSvg(idx) {
  const n = idx.length;
  const R = 500, C = 500;
  if (n === 0) {
    return `<svg viewBox="0 0 1000 1000"><circle cx="${C}" cy="${C}" r="${R}" fill="#f3f5f6"/><text x="${C}" y="${C + 210}" text-anchor="middle" font-size="44" font-weight="700" fill="#5e6970">名前を入れてください</text></svg>`;
  }
  const seg = 360 / n;
  const fs = Math.max(16, Math.min(52, 560 / Math.max(n, 6) + 10));
  const maxChars = n > 40 ? 4 : n > 20 ? 6 : n > 10 ? 8 : 10;
  const short = (s) => (s.length > maxChars ? s.slice(0, maxChars - 1) + "…" : s);
  const pt = (deg, r) => { const a = ((deg - 90) * Math.PI) / 180; return [C + r * Math.cos(a), C + r * Math.sin(a)]; };
  const parts = idx.map((pi, k) => {
    const a0 = k * seg, a1 = (k + 1) * seg;
    const fill = FILLS[(n % FILLS.length === 1 && k === n - 1 ? k + 1 : k) % FILLS.length];
    const shape = n === 1
      ? `<circle cx="${C}" cy="${C}" r="${R}" fill="${fill}"/>`
      : (() => { const [x0, y0] = pt(a0, R), [x1, y1] = pt(a1, R); return `<path d="M${C},${C} L${x0.toFixed(1)},${y0.toFixed(1)} A${R},${R} 0 ${seg > 180 ? 1 : 0} 1 ${x1.toFixed(1)},${y1.toFixed(1)} Z" fill="${fill}" stroke="#fff" stroke-width="${n > 60 ? 1 : 3}"/>`; })();
    const mid = a0 + seg / 2;
    // 文字は中心から外へ向けて、枠のまん中に置く
    const text = short(people[pi].name);
    const size = Math.min(fs, 300 / Math.max(1, text.length)); // 長い名前は小さく（中心のボタンにかからないように）
    // 左半分の枠は、文字が逆さまにならないよう向きを反対にする（外側から中心へ読む）
    const flip = mid > 180;
    const label = `<text transform="rotate(${(flip ? mid + 90 : mid - 90).toFixed(2)} ${C} ${C})" x="${flip ? C - R * 0.9 : C + R * 0.9}" y="${C}" text-anchor="${flip ? "start" : "end"}" dominant-baseline="central" font-size="${size.toFixed(1)}" font-weight="800" fill="#1c2a33">${esc(text)}</text>`;
    return shape + (n <= 120 ? label : "");
  });
  return `<svg viewBox="0 0 1000 1000" font-family='"M PLUS Rounded 1c","Hiragino Maru Gothic ProN",sans-serif'>${parts.join("")}</svg>`;
}

function draw() {
  const idx = remaining();
  el.wheel.innerHTML = wheelSvg(idx);
  el.what.textContent = el.title.value.trim();
  const can = idx.length > 0 && !spinning;
  el.go.disabled = el.hub.disabled = !can;
  if (!people.length) el.left.textContent = "";
  else if (!idx.length) el.left.textContent = "全員決まりました。「全員に戻す」で最初からやり直せます。";
  else el.left.textContent = off.size ? `のこり ${idx.length}人（${people.length}人中）` : `${idx.length}人`;
  drawCands();
  drawHistory();
}

function drawHistory() {
  el.hist.hidden = history.length === 0;
  el.histList.innerHTML = history.map((h) => `<li>${esc(h.name)}${h.kept ? "<small>外さずに回した回</small>" : ""}</li>`).join("");
}

/* ---------- 回す ---------- */
function spin() {
  if (spinning) return;
  closeResult(true);
  const idx = remaining();
  if (!idx.length) return;
  const k = randInt(idx.length);
  const winner = idx[k];
  const seg = 360 / idx.length;
  // 止まる位置：当たった人の枠の中（端すぎないところ）
  const target = k * seg + seg * (0.15 + 0.7 * (randInt(1000) / 1000));
  const spins = reduceMotion() ? 1 : 6 + randInt(3);
  const base = rotation - (rotation % 360);
  rotation = base + spins * 360 + ((360 - target) % 360);
  spinning = true;
  el.stage.classList.add("spinning");
  el.go.disabled = el.hub.disabled = true;
  el.names.readOnly = true;
  el.wheel.style.transitionDuration = reduceMotion() ? "0.6s" : "";
  el.wheel.style.transform = `rotate(${rotation}deg)`;
  const done = () => {
    el.wheel.removeEventListener("transitionend", done);
    clearTimeout(timer);
    finish(winner);
  };
  // transitionend が来ないとき（タブを裏にした等）の保険
  const timer = setTimeout(done, reduceMotion() ? 900 : 5200);
  el.wheel.addEventListener("transitionend", done);
}

function finish(winner) {
  spinning = false;
  el.stage.classList.remove("spinning");
  el.names.readOnly = false;
  const name = people[winner]?.name ?? "";
  const autoOff = el.auto.checked;
  history.push({ name, kept: !autoOff });
  pending = autoOff ? winner : null;
  const what = el.title.value.trim();
  el.k.textContent = what ? `${what}は` : "選ばれたのは";
  el.win.textContent = name;
  const leftAfter = remaining().length - (autoOff ? 1 : 0);
  el.next.hidden = leftAfter <= 0;
  el.result.hidden = false;
  confetti();
  draw();
  el.go.disabled = el.hub.disabled = true; // 結果を閉じるまでは回さない
  el.next.hidden ? el.close.focus() : el.next.focus();
}

function closeResult(silent) {
  if (el.result.hidden) return;
  el.result.hidden = true;
  if (pending !== null) { off.add(pending); pending = null; }
  $(".rl-confetti", el.result).innerHTML = "";
  draw();
  if (!silent) el.go.focus();
}

function confetti() {
  const box = $(".rl-confetti", el.result);
  box.innerHTML = "";
  if (reduceMotion()) return;
  const colors = ["#2c7f8f", "#e0a33a", "#3f9a64", "#c8543f", "#8a5bb5", "#3f6fb8"];
  box.innerHTML = Array.from({ length: 28 }, (_, i) => {
    const x = (randInt(800) - 400) + "px", y = (randInt(420) - 120) + "px", r = randInt(720) - 360 + "deg";
    return `<i style="--x:${x};--y:${y};--r:${r};background:${colors[i % colors.length]};animation-delay:${randInt(120)}ms"></i>`;
  }).join("");
}

/* ---------- 大きく表示 ---------- */
function setFull(on) {
  el.stage.classList.toggle("full", on);
  document.body.classList.toggle("rl-lock", on);
  el.full.setAttribute("aria-pressed", String(on));
  el.full.querySelector("span").textContent = on ? "元に戻す" : "大きく表示";
  if (on) el.stage.requestFullscreen?.().catch(() => {});
  else if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
}
el.full.addEventListener("click", () => setFull(!el.stage.classList.contains("full")));
document.addEventListener("fullscreenchange", () => { if (!document.fullscreenElement && el.stage.classList.contains("full")) setFull(false); });
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  if (!el.result.hidden) closeResult();
  else if (el.stage.classList.contains("full")) setFull(false);
});

/* ---------- 操作 ---------- */
el.names.addEventListener("input", readNames);
el.title.addEventListener("input", () => { el.what.textContent = el.title.value.trim(); });
$$("[data-preset]").forEach((b) => b.addEventListener("click", () => { el.title.value = b.dataset.preset; el.what.textContent = b.dataset.preset; }));
el.go.addEventListener("click", spin);
el.hub.addEventListener("click", spin);
el.next.addEventListener("click", () => { closeResult(true); spin(); });
el.close.addEventListener("click", () => closeResult());
el.candList.addEventListener("click", (e) => {
  const b = e.target.closest("[data-i]");
  if (!b || spinning) return;
  const i = Number(b.dataset.i);
  off.has(i) ? off.delete(i) : off.add(i);
  draw();
});
el.restore.addEventListener("click", () => {
  if (spinning) return;
  closeResult(true);
  off.clear();
  draw();
});
el.reset.addEventListener("click", () => {
  if (spinning) return;
  closeResult(true);
  off.clear();
  history = [];
  draw();
});
el.copy.addEventListener("click", () => {
  const what = el.title.value.trim();
  const text = [`【${what || "ルーレットの結果"}】`, ...history.map((h, i) => `${i + 1}. ${h.name}`)].join("\n");
  copyText(text, el.copy);
});

draw();
