/* ===========================================================
   グループ分けメーカー（/group/）
   名前 → 数を決める → 分ける → シャッフル／コピー／画像／CSV
   振り分けは src/lib/arrange.js（条件の追加もそちら）
   =========================================================== */
import { $, esc, svg, download, copyText, showMsgs, picker, canvasToBlob, fitText, FONT, INK, HUES, stamp, reveal, submitOnCtrlEnter } from "./common.js";
import { peopleForm, readRules, hasTags } from "./people.js";
import { arrange, randInt } from "../../lib/arrange.js";

const form = $("#grp-form");
const out = $("#grp-out");
const msgs = $("#grp-msgs");
const names = $("#grp-names");
const even = $("#grp-even");
const random = $("#grp-random");
const leader = $("#grp-leader");
const spreadRow = $("#grp-spread-row");
const spread = $("#grp-spread");
const apart = $("#grp-apart");
const together = $("#grp-together");
const leadNote = $("#grp-lead-note");
const pf = peopleForm({ names, count: $("#grp-names-count"), groups: $("#grp-groups"), per: $("#grp-per"), summary: $("#grp-sum"), unit: "グループ", even: () => even.checked, leadMark: true });
const label = picker($("#grp-label"), () => { if (result) draw(); });
const emptyHtml = out.innerHTML;

const ABC = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const groupName = (i) => (label.get() === "num" ? `${i + 1}班` : `${i < 26 ? ABC[i] : ABC[Math.floor(i / 26) - 1] + ABC[i % 26]}グループ`);

let result = null; // { people, groups, randomLead }

/* 名前の前かうしろに ★ を付けた人＝決まっているリーダー（面接官・ファシリテーターなど） */
const markedLeads = (people) => people.map((p, i) => (p.lead ? i : -1)).filter((i) => i >= 0);
function onNames() {
  const { people } = pf.read();
  spreadRow.hidden = !hasTags(people);
  const n = markedLeads(people).length;
  leadNote.hidden = !n;
  leadNote.textContent = n ? `★の${n}人を、リーダーとして1グループに1人ずつ分けます` : "";
}
names.addEventListener("input", onNames);
even.addEventListener("change", pf.sync);

function decide(scroll = true) {
  const { people, warnings } = pf.read();
  if (people.length < 2) {
    showMsgs(msgs, [["err", "参加者を2人以上入れてください（1行に1人）。"]]);
    names.focus();
    return;
  }
  const sizes = pf.sizes();
  const { rules, warnings: rw } = readRules(people, [["apart", apart], ["together", together]]);
  if (hasTags(people) && spread.checked) rules.push({ type: "spread" });
  const marked = markedLeads(people);
  if (marked.length) rules.push({ type: "lead", members: marked });
  const { groups, unmet } = arrange(people, sizes, { random: random.checked, rules });
  const notes = [...warnings, ...rw].map((w) => ["warn", w]);
  if (unmet > 0) notes.push(["warn", `人数の都合で、守れなかった条件が${unmet}件あります。`]);
  if (sizes.length === 1) notes.push(["info", "1つのグループになりました。グループの数をふやしてください。"]);
  if (marked.length > sizes.length) notes.push(["info", `リーダー（★）が${marked.length}人、グループが${sizes.length}つなので、リーダーが2人以上いるグループがあります。`]);
  else if (marked.length && marked.length < sizes.length && !leader.checked) notes.push(["info", `リーダー（★）のいないグループが${sizes.length - marked.length}つあります。「リーダーを決める」をオンにすると、そのグループだけランダムで決めます。`]);
  showMsgs(msgs, notes);
  // グループの中は、決まっているリーダーを先頭に
  const ordered = groups.map((g) => [...g.filter((i) => people[i].lead), ...g.filter((i) => !people[i].lead)]);
  // ★のいないグループのための、ランダムのリーダー（「リーダーを決める」がオンのときだけ表示）
  const randomLead = ordered.map((g) => (g.length && !g.some((i) => people[i].lead) ? g[randInt(g.length)] : -1));
  result = { people, groups: ordered, randomLead };
  draw();
  if (scroll && window.innerWidth <= 860) reveal(out);
}

form.addEventListener("submit", (e) => { e.preventDefault(); decide(); });
submitOnCtrlEnter(names, () => decide());
leader.addEventListener("change", () => { if (result) draw(); });

const isLead = (gi, i) => result.people[i].lead || (leader.checked && result.randomLead[gi] === i);
const showLead = () => leader.checked || result.people.some((p) => p.lead);
/* 表示する順：印の付いたリーダーを先頭に（★の人も、ランダムで選んだ人も）。残りは決めた順のまま */
const members = (gi) => {
  const g = result.groups[gi];
  if (!showLead()) return g;
  return [...g.filter((i) => isLead(gi, i)), ...g.filter((i) => !isLead(gi, i))];
};

function draw() {
  const { people, groups } = result;
  const lead = showLead();
  const tags = hasTags(people);
  out.innerHTML = `
    <div class="out-head">
      <div>
        <p class="out-t"><b>${groups.length}</b>グループ・${people.length}人</p>
        <p class="out-d">${[...new Set(groups.map((g) => g.length))].sort((a, b) => b - a).map((n) => `${n}人`).join("・")}のグループ${lead ? "・リーダーに印" : ""}</p>
      </div>
      <div class="acts">
        <button type="button" class="btn btn-primary" data-do="shuffle">${svg("shuffle", 16)}もう一回シャッフル</button>
        <button type="button" class="btn btn-ghost" data-do="copy">${svg("copy", 15)}結果をコピー</button>
        <button type="button" class="btn btn-ghost" data-do="image">${svg("image", 15)}画像で保存</button>
        <button type="button" class="btn btn-ghost" data-do="csv">${svg("download", 15)}CSVで保存</button>
        <button type="button" class="btn btn-ghost" data-do="reset">${svg("reset", 15)}リセット</button>
      </div>
    </div>
    <div class="gp-grid">${groups.map((g, gi) => `
      <section class="gp hue-${gi % 8} pop-in" style="animation-delay:${Math.min(gi * 40, 400)}ms" aria-label="${esc(groupName(gi))}">
        <div class="gp-h"><b>${esc(groupName(gi))}</b><span>${g.length}人</span></div>
        <ol>${members(gi).map((i) => `<li>${esc(people[i].name)}${lead && isLead(gi, i) ? `<span class="gp-lead">${svg("crown", 12)}リーダー</span>` : ""}${tags && people[i].tag ? `<small>${esc(people[i].tag)}</small>` : ""}</li>`).join("")}</ol>
      </section>`).join("")}
    </div>`;
}

function asText() {
  const { people, groups } = result;
  const lines = [`【グループ分け】${people.length}人・${groups.length}グループ`];
  groups.forEach((g, gi) => {
    lines.push("", `■${groupName(gi)}（${g.length}人）`);
    members(gi).forEach((i) => lines.push(people[i].name + (showLead() && isLead(gi, i) ? "（リーダー）" : "") + (people[i].tag ? `／${people[i].tag}` : "")));
  });
  return lines.join("\n");
}

function asCsv() {
  const { people, groups } = result;
  const q = (v) => { const s = String(v ?? ""); const safe = /^[=+\-@\t\r]/.test(s) ? "'" + s : s; return /[",\r\n]/.test(safe) || safe !== s ? `"${safe.replace(/"/g, '""')}"` : safe; };
  const tags = hasTags(people);
  const rows = [["グループ", "名前", ...(tags ? ["部署など"] : []), ...(showLead() ? ["リーダー"] : [])]];
  groups.forEach((g, gi) => members(gi).forEach((i) => rows.push([groupName(gi), people[i].name, ...(tags ? [people[i].tag] : []), ...(showLead() ? [isLead(gi, i) ? "○" : ""] : [])])));
  return "﻿" + rows.map((r) => r.map(q).join(",")).join("\r\n") + "\r\n";
}

async function toImage() {
  const { people, groups } = result;
  const cols = Math.min(4, groups.length);
  const pad = 40, gap = 28, colW = 250, rowH = 40;
  const W = pad * 2 + cols * colW + (cols - 1) * gap;
  const maxRows = Math.max(...groups.map((g) => g.length));
  const blockH = 52 + maxRows * rowH;
  const lines = Math.ceil(groups.length / cols);
  const H = 110 + lines * blockH + (lines - 1) * gap + pad;
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
  ctx.fillText("グループ分け", pad, 52);
  ctx.fillStyle = INK.muted;
  ctx.font = `500 16px ${FONT}`;
  ctx.fillText(`${people.length}人・${groups.length}グループ`, pad + 180, 54);
  ctx.fillStyle = INK.line;
  ctx.fillRect(pad, 84, W - pad * 2, 1);
  groups.forEach((g, gi) => {
    const x = pad + (gi % cols) * (colW + gap);
    const y = 110 + Math.floor(gi / cols) * (blockH + gap);
    const hue = HUES[gi % HUES.length];
    ctx.fillStyle = INK.ink;
    ctx.font = `800 20px ${FONT}`;
    ctx.textAlign = "left";
    ctx.fillText(fitText(ctx, groupName(gi), colW - 50), x, y + 14);
    ctx.fillStyle = INK.muted;
    ctx.font = `500 14px ${FONT}`;
    ctx.textAlign = "right";
    ctx.fillText(`${g.length}人`, x + colW, y + 15);
    ctx.textAlign = "left";
    ctx.fillStyle = hue;
    ctx.fillRect(x, y + 32, colW, 3);
    members(gi).forEach((i, k) => {
      const ry = y + 44 + k * rowH;
      ctx.fillStyle = hue;
      ctx.beginPath(); ctx.arc(x + 6, ry + rowH / 2, 4, 0, Math.PI * 2); ctx.fill();
      const lead = showLead() && isLead(gi, i);
      ctx.fillStyle = INK.ink;
      ctx.font = `700 16px ${FONT}`;
      ctx.fillText(fitText(ctx, people[i].name + (lead ? " ★" : ""), colW - 24), x + 18, ry + rowH / 2);
      ctx.fillStyle = INK.line;
      ctx.fillRect(x, ry + rowH - 1, colW, 1);
    });
  });
  ctx.fillStyle = INK.muted;
  ctx.font = `500 12px ${FONT}`;
  ctx.textAlign = "right";
  ctx.fillText("insemble tools グループ分けメーカー", W - pad, H - 18);
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
  if (d === "csv") download(new Blob([asCsv()], { type: "text/csv;charset=utf-8" }), `グループ分け_${stamp()}.csv`);
  if (d === "image") {
    try { download(await toImage(), `グループ分け_${stamp()}.png`); }
    catch (err) { showMsgs(msgs, [["err", "画像を作れませんでした。人数が多いときは「結果をコピー」をお使いください。"]]); }
  }
  if (d === "reset") {
    result = null;
    out.innerHTML = emptyHtml;
    pf.reset();
    apart.value = together.value = "";
    spreadRow.hidden = true;
    leadNote.hidden = true;
    showMsgs(msgs, []);
    names.focus();
  }
});
