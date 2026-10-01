/* ===========================================================
   席順メーカー（/seat/）
   名前 → 卓の数・人数 → 席を決める → シャッフル／画像で保存／コピー
   振り分けは src/lib/arrange.js（条件の追加もそちら）
   =========================================================== */
import { $, esc, svg, download, copyText, showMsgs, picker, canvasToBlob, roundRect, fitText, FONT, INK, HUES, stamp, reveal, submitOnCtrlEnter } from "./common.js";
import { peopleForm, readRules } from "./people.js";
import { arrange } from "../../lib/arrange.js";

const ROUND_MAX = 12; // 丸テーブルで見やすく並べられる人数

const form = $("#seat-form");
const out = $("#seat-out");
const msgs = $("#seat-msgs");
const names = $("#seat-names");
const apart = $("#seat-apart");
const random = $("#seat-random");
const pf = peopleForm({ names, count: $("#seat-names-count"), groups: $("#seat-groups"), per: $("#seat-per"), summary: $("#seat-sum"), unit: "卓" });
const shape = picker($("#seat-shape"), () => { if (result) { result.shape = shape.get(); draw(false); } });
const emptyHtml = out.innerHTML;

let result = null; // { people, tables: number[][], shape }

function decide(scroll = true) {
  const { people, warnings } = pf.read();
  if (people.length < 2) {
    showMsgs(msgs, [["err", "参加者を2人以上入れてください（1行に1人）。"]]);
    names.focus();
    return;
  }
  const sizes = pf.sizes();
  const { rules, warnings: rw } = readRules(people, [["apart", apart]]);
  const { groups, unmet } = arrange(people, sizes, { random: random.checked, rules });
  const notes = [...warnings, ...rw].map((w) => ["warn", w]);
  if (unmet > 0) notes.push(["warn", `人数の都合で、別の卓にできなかった組み合わせが${unmet}組あります。卓の数をふやすと守りやすくなります。`]);
  showMsgs(msgs, notes);
  result = { people, tables: groups, shape: shape.get() };
  draw(true);
  if (scroll && window.innerWidth <= 860) reveal(out);
}

form.addEventListener("submit", (e) => { e.preventDefault(); decide(); });
submitOnCtrlEnter(names, () => decide());

function seatHtml(p, i, extra = "", style = "") {
  return `<div class="st-seat pop-in ${extra}" style="animation-delay:${Math.min(i * 25, 400)}ms;${style}">${p ? esc(p.name) : "空席"}</div>`;
}

function tableHtml(members, ti, capacity) {
  const shapeNow = result.shape === "round" && capacity <= ROUND_MAX ? "round" : "long";
  const ppl = members.map((i) => result.people[i]);
  const seats = [...ppl, ...Array(Math.max(0, capacity - ppl.length)).fill(null)];
  let body;
  if (shapeNow === "round") {
    body = `<div class="st-round">${seats.map((p, i) => {
      const a = (i / seats.length) * Math.PI * 2 - Math.PI / 2;
      // 半径35%：横の名前（幅29%）が枠からはみ出さず、卓（半径19%）にも重ならない
      const left = 50 + 35 * Math.cos(a), top = 50 + 35 * Math.sin(a);
      return seatHtml(p, i, p ? "" : "empty", `left:${left.toFixed(2)}%;top:${top.toFixed(2)}%`);
    }).join("")}</div>`;
  } else {
    // 向かい合わせ：1人目が左、2人目がその向かい（右）…
    const rows = Math.ceil(seats.length / 2);
    body = `<div class="st-long">${seats.map((p, i) => seatHtml(p, i, (i % 2 ? "r" : "l") + (p ? "" : " empty"), `grid-row:${Math.floor(i / 2) + 1}`)).join("")}<div class="st-board" style="grid-row:1 / ${rows + 1}"></div></div>`;
  }
  return `<section class="st-table hue-${ti % 8}" aria-label="${ti + 1}卓">
    <div class="st-h"><b>${ti + 1}卓</b><span>${ppl.length}人</span></div>
    ${body}
  </section>`;
}

function draw() {
  const { tables, people } = result;
  const capacity = Math.max(...tables.map((t) => t.length));
  const roundTooMany = result.shape === "round" && capacity > ROUND_MAX;
  out.innerHTML = `
    <div class="out-head">
      <div>
        <p class="out-t">座席表 <b>${tables.length}</b>卓・${people.length}人</p>
        <p class="out-d">${result.shape === "round" && !roundTooMany ? "丸テーブル（上から時計回り）" : "長机（左右が向かい合わせ）"}${roundTooMany ? `・丸テーブルは${ROUND_MAX}人までなので長机で表示しています` : ""}</p>
      </div>
      <div class="acts">
        <button type="button" class="btn btn-primary" data-do="shuffle">${svg("shuffle", 16)}もう一回シャッフル</button>
        <button type="button" class="btn btn-ghost" data-do="image">${svg("image", 15)}画像で保存</button>
        <button type="button" class="btn btn-ghost" data-do="copy">${svg("copy", 15)}結果をコピー</button>
        <button type="button" class="btn btn-ghost" data-do="reset">${svg("reset", 15)}リセット</button>
      </div>
    </div>
    <div class="st-grid">${tables.map((t, i) => tableHtml(t, i, capacity)).join("")}</div>`;
}

function asText() {
  const { tables, people } = result;
  const round = result.shape === "round" && Math.max(...tables.map((t) => t.length)) <= ROUND_MAX;
  const lines = [`【席順】${people.length}人・${tables.length}卓`];
  tables.forEach((t, i) => {
    const ns = t.map((k) => people[k].name);
    lines.push("", `■${i + 1}卓（${ns.length}人）`);
    if (round) lines.push(ns.join(" → ") + "（時計回り）");
    else for (let r = 0; r < ns.length; r += 2) lines.push(ns[r + 1] ? `${ns[r]} ｜ ${ns[r + 1]}` : ns[r]);
  });
  return lines.join("\n");
}

/* ---------- 画像で保存（canvas に描く。画面の見た目に近づける） ---------- */
async function toImage() {
  const { tables, people } = result;
  const capacity = Math.max(...tables.map((t) => t.length));
  const round = result.shape === "round" && capacity <= ROUND_MAX;
  const cols = tables.length === 1 ? 1 : tables.length === 2 || tables.length === 4 ? 2 : 3;
  const W = cols === 1 ? 620 : cols === 2 ? 1040 : 1440;
  const pad = 40, gap = 32;
  const cellW = (W - pad * 2 - gap * (cols - 1)) / cols;
  const rowH = 52;
  const tableH = round ? cellW * 0.86 + 48 : Math.ceil(capacity / 2) * rowH + 60;
  const rows = Math.ceil(tables.length / cols);
  const H = 110 + rows * tableH + (rows - 1) * gap + pad;
  // くっきり見えるよう2倍で描く。卓が多くて大きすぎるときは、Safari の上限に収まるよう下げる
  const scale = Math.min(2, Math.sqrt(14_000_000 / (W * H)));
  const c = document.createElement("canvas");
  c.width = W * scale;
  c.height = H * scale;
  const ctx = c.getContext("2d");
  ctx.scale(scale, scale);
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, W, H);
  ctx.textBaseline = "middle";

  ctx.fillStyle = INK.ink;
  ctx.font = `800 28px ${FONT}`;
  ctx.fillText("座席表", pad, 52);
  ctx.fillStyle = INK.muted;
  ctx.font = `500 16px ${FONT}`;
  const d = new Date();
  ctx.fillText(`${people.length}人・${tables.length}卓　${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`, pad + 110, 54);
  ctx.fillStyle = INK.line;
  ctx.fillRect(pad, 84, W - pad * 2, 1);

  tables.forEach((t, ti) => {
    const x = pad + (ti % cols) * (cellW + gap);
    const y = 110 + Math.floor(ti / cols) * (tableH + gap);
    const hue = HUES[ti % HUES.length];
    ctx.fillStyle = INK.ink;
    ctx.font = `800 20px ${FONT}`;
    ctx.fillText(`${ti + 1}卓`, x, y + 14);
    ctx.fillStyle = INK.muted;
    ctx.font = `500 14px ${FONT}`;
    ctx.fillText(`${t.length}人`, x + 50, y + 15);
    ctx.fillStyle = hue;
    ctx.fillRect(x, y + 32, cellW, 3);
    const top = y + 48;
    const ns = t.map((k) => people[k].name);
    const seatBox = (cx, cy, w, h, name, dot) => {
      roundRect(ctx, cx, cy, w, h, 10);
      ctx.fillStyle = "#fff"; ctx.fill();
      ctx.strokeStyle = "#c9d0d4"; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = INK.ink;
      ctx.font = `700 15px ${FONT}`;
      if (dot) {
        ctx.fillStyle = hue; ctx.beginPath(); ctx.arc(cx + 14, cy + h / 2, 4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = INK.ink; ctx.textAlign = "left";
        ctx.fillText(fitText(ctx, name, w - 34), cx + 26, cy + h / 2 + 1);
      } else {
        ctx.textAlign = "center";
        ctx.fillText(fitText(ctx, name, w - 12), cx + w / 2, cy + h / 2 + 1);
        ctx.textAlign = "left";
      }
    };
    if (round) {
      const size = cellW * 0.86;
      const cx = x + cellW / 2, cy = top + size / 2;
      ctx.beginPath(); ctx.arc(cx, cy, size * 0.23, 0, Math.PI * 2);
      ctx.fillStyle = INK.paper; ctx.fill(); ctx.strokeStyle = "#c9d0d4"; ctx.lineWidth = 1.5; ctx.stroke();
      const bw = Math.min(110, size * 0.34), bh = 36;
      ns.forEach((n, i) => {
        const a = (i / capacity) * Math.PI * 2 - Math.PI / 2;
        seatBox(cx + Math.cos(a) * size * 0.4 - bw / 2, cy + Math.sin(a) * size * 0.4 - bh / 2, bw, bh, n, false);
      });
    } else {
      const bw = (cellW - 44) / 2, bh = 42;
      const rowsN = Math.ceil(capacity / 2);
      roundRect(ctx, x + bw + 10, top, 24, rowsN * rowH - 10, 8);
      ctx.fillStyle = INK.paper; ctx.fill(); ctx.strokeStyle = "#c9d0d4"; ctx.lineWidth = 1.5; ctx.stroke();
      ns.forEach((n, i) => seatBox(i % 2 ? x + bw + 44 : x, top + Math.floor(i / 2) * rowH, bw, bh, n, true));
    }
  });

  ctx.fillStyle = INK.muted;
  ctx.font = `500 12px ${FONT}`;
  ctx.textAlign = "right";
  ctx.fillText("insemble tools 席順メーカー", W - pad, H - 18);
  const blob = await canvasToBlob(c);
  c.width = c.height = 0;
  return blob;
}

out.addEventListener("click", async (e) => {
  const b = e.target.closest("[data-do]");
  if (!b || !result) return;
  const d = b.dataset.do;
  if (d === "shuffle") decide(false);
  if (d === "copy") copyText(asText(), b);
  if (d === "image") {
    try { download(await toImage(), `座席表_${stamp()}.png`); }
    catch (err) { showMsgs(msgs, [["err", "画像を作れませんでした。人数が多いときは「結果をコピー」をお使いください。"]]); }
  }
  if (d === "reset") {
    result = null;
    out.innerHTML = emptyHtml;
    pf.reset();
    apart.value = "";
    showMsgs(msgs, []);
    names.focus();
  }
});
