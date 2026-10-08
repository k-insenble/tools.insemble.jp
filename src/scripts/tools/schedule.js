/* ===========================================================
   スケジュール→Excelメーカー（/schedule-excel/）
   予定を1行ずつ追加 → 表の形を選ぶ → プレビュー → Excel／CSV で保存
   - 表の形は src/lib/schedule-templates.js（ここは入力と表示だけ）
   - 入力中の内容は localStorage（このブラウザの中だけ）に一時保存。リセットで消す
   =========================================================== */
import { $, esc, svg, download, showMsgs, picker, safeName, stamp, flash } from "./common.js";
import { TEMPLATES, getTemplate, toCsv } from "../../lib/schedule-templates.js";
import { buildXlsx, timeSerial } from "../../lib/xlsx.js";

const KEY = "schedule.draft";
const MAX_ROWS = 1000;
const FIELDS = [
  ["date", "日付", "date"],
  ["start", "開始", "time"],
  ["end", "終了", "time"],
  ["title", "内容", "text"],
  ["who", "担当", "text"],
  ["note", "備考", "text"],
];

const el = {
  title: $("#sch-title"),
  tplDesc: $("#sch-tpl-desc"),
  head: $(".sch-head"),
  rows: $("#sch-rows"),
  empty: $("#sch-empty"),
  add: $("#sch-add"),
  sort: $("#sch-sort"),
  paste: $("#sch-paste"),
  pasteGo: $("#sch-paste-go"),
  msgs: $("#sch-msgs"),
  prevWrap: $("#sch-prev-wrap"),
  prev: $("#sch-prev"),
  xlsx: $("#sch-xlsx"),
  csv: $("#sch-csv"),
  reset: $("#sch-reset"),
  saved: $("#sch-saved"),
  resetAll: $("#sch-reset-all"),
};

const tpl = picker($("#sch-tpl"), (v) => { el.tplDesc.textContent = getTemplate(v).desc; save(); preview(); });

/** @type {{ id: number, date: string, start: string, end: string, title: string, who: string, note: string }[]} */
let rows = [];
let seq = 0;
const blank = () => ({ id: ++seq, date: "", start: "", end: "", title: "", who: "", note: "" });
// 日付は「予定を追加」で自動で入るので、日付だけの行は空とみなす（Excel にも出さない）
const isEmpty = (r) => !FIELDS.some(([k]) => k !== "date" && String(r[k] || "").trim());
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };

/* ---------- 一時保存（このブラウザの中だけ） ---------- */
let saveTimer = 0;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      const data = { title: el.title.value, tpl: tpl.get(), rows: rows.filter((r) => !isEmpty(r)).map(({ id, ...r }) => r) };
      if (!data.title && !data.rows.length) localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, JSON.stringify(data));
    } catch (e) {}
  }, 300);
}
function load() {
  try {
    const d = JSON.parse(localStorage.getItem(KEY) || "null");
    if (!d || typeof d !== "object") return;
    el.title.value = String(d.title || "").slice(0, 60);
    if (TEMPLATES.some((t) => t.id === d.tpl)) { tpl.set(d.tpl, false); el.tplDesc.textContent = getTemplate(d.tpl).desc; }
    if (Array.isArray(d.rows)) rows = d.rows.slice(0, MAX_ROWS).map((r) => ({ ...blank(), ...clean(r) }));
  } catch (e) {}
}
/* 保存したものや貼り付けたものは、決まった形の文字だけにそろえる */
function clean(r) {
  const s = (v, n) => String(v ?? "").slice(0, n);
  return {
    date: /^\d{4}-\d{2}-\d{2}$/.test(r?.date) ? r.date : "",
    start: timeSerial(r?.start) !== null ? pad2(r.start) : "",
    end: timeSerial(r?.end) !== null ? pad2(r.end) : "",
    title: s(r?.title, 500), who: s(r?.who, 100), note: s(r?.note, 500),
  };
}
const pad2 = (t) => { const [h, m] = String(t).split(":"); return `${h.padStart(2, "0")}:${m}`; };

/* ---------- 行 ---------- */
function rowHtml(r, i) {
  const f = ([k, label, type]) => {
    const warn = k === "end" && r.start && r.end && r.end < r.start ? " warn" : "";
    const attrs = type === "text" ? `type="text" maxlength="${k === "who" ? 100 : 500}" autocomplete="off"` : `type="${type}"`;
    return `<label class="sch-f ${k}"><span class="sch-lbl">${label}</span><input class="inp${warn}" ${attrs} data-k="${k}" value="${esc(r[k])}" aria-label="${i + 1}行目の${label}" ${k === "title" ? 'placeholder="例：開場・受付"' : ""}/></label>`;
  };
  return `<li class="sch-row" data-id="${r.id}">
    <span class="sch-n" aria-hidden="true"></span>
    ${FIELDS.map(f).join("")}
    <span class="sch-ctl">
      <button type="button" class="icon-btn" data-do="up" aria-label="${i + 1}行目を上へ移動" ${i === 0 ? "disabled" : ""}>${svg("up", 17)}</button>
      <button type="button" class="icon-btn" data-do="down" aria-label="${i + 1}行目を下へ移動" ${i === rows.length - 1 ? "disabled" : ""}>${svg("down", 17)}</button>
      <button type="button" class="icon-btn" data-do="dup" aria-label="${i + 1}行目を複製">${svg("dup", 16)}</button>
      <button type="button" class="icon-btn del" data-do="del" aria-label="${i + 1}行目を削除">${svg("trash", 16)}</button>
    </span>
  </li>`;
}

function drawRows(focus) {
  el.rows.innerHTML = rows.map(rowHtml).join("");
  el.empty.hidden = rows.length > 0;
  el.head.hidden = rows.length === 0;
  el.sort.hidden = rows.length < 2;
  el.add.disabled = rows.length >= MAX_ROWS;
  if (focus) {
    const [id, k, cls] = focus;
    const li = el.rows.querySelector(`[data-id="${id}"]`);
    if (li) {
      if (cls) li.classList.add(cls);
      li.querySelector(`[data-k="${k}"]`)?.focus();
    }
  }
  preview();
}

function add(after) {
  if (rows.length >= MAX_ROWS) return showMsgs(el.msgs, [["warn", `予定は${MAX_ROWS}行まで入れられます。使わない行を削除するか、表を分けて作ってください。`]]);
  const prev = after ?? rows[rows.length - 1];
  // 前の行の日付と終了時刻を引き継ぐ（続けて入れやすいように）
  const r = { ...blank(), date: prev?.date || today(), start: prev?.end || "" };
  rows.push(r);
  drawRows([r.id, "title", "moved"]);
  save();
}

el.add.addEventListener("click", () => add());

el.rows.addEventListener("input", (e) => {
  const inp = e.target.closest("[data-k]");
  if (!inp) return;
  const r = rows.find((x) => x.id === Number(inp.closest(".sch-row").dataset.id));
  if (!r) return;
  r[inp.dataset.k] = inp.value;
  if (inp.dataset.k === "start" || inp.dataset.k === "end") {
    const endInp = inp.closest(".sch-row").querySelector('[data-k="end"]');
    endInp.classList.toggle("warn", !!(r.start && r.end && r.end < r.start));
  }
  save();
  preview();
});

// 最後の行の入力欄で Enter → 次の行を追加
el.rows.addEventListener("keydown", (e) => {
  if (e.key !== "Enter" || e.isComposing || e.target.type === "date" || e.target.type === "time") return;
  const li = e.target.closest(".sch-row");
  if (!li || li !== el.rows.lastElementChild) return;
  e.preventDefault();
  add();
});

el.rows.addEventListener("click", (e) => {
  const b = e.target.closest("[data-do]");
  if (!b) return;
  const id = Number(b.closest(".sch-row").dataset.id);
  const i = rows.findIndex((x) => x.id === id);
  if (i < 0) return;
  const d = b.dataset.do;
  if (d === "up" && i > 0) { [rows[i - 1], rows[i]] = [rows[i], rows[i - 1]]; drawRows(); focusCtl(id, "up"); }
  if (d === "down" && i < rows.length - 1) { [rows[i + 1], rows[i]] = [rows[i], rows[i + 1]]; drawRows(); focusCtl(id, "down"); }
  if (d === "dup") { const c = { ...rows[i], id: ++seq }; rows.splice(i + 1, 0, c); drawRows([c.id, "title", "moved"]); }
  if (d === "del") {
    rows.splice(i, 1);
    drawRows();
    const next = rows[Math.min(i, rows.length - 1)];
    if (next) focusCtl(next.id, "del"); else el.add.focus();
  }
  save();
});
const focusCtl = (id, d) => {
  const li = el.rows.querySelector(`[data-id="${id}"]`);
  const btn = li?.querySelector(`[data-do="${d}"]`);
  (btn && !btn.disabled ? btn : li?.querySelector('[data-k="title"]'))?.focus();
};

el.sort.addEventListener("click", () => {
  rows.sort((a, b) => (a.date || "9999").localeCompare(b.date || "9999") || (a.start || "99").localeCompare(b.start || "99"));
  drawRows();
  save();
  flash(el.sort, "並べ替えました");
});

el.title.addEventListener("input", () => { save(); preview(); });

/* ---------- まとめて貼り付け ---------- */
function toIsoDate(s) {
  const t = String(s).trim().replace(/[年月]/g, "/").replace(/日.*$/, "").replace(/\(.+\)$/, "").replace(/（.+）$/, "");
  let m = /^(\d{4})[/.-](\d{1,2})[/.-](\d{1,2})$/.exec(t);
  if (!m) { const n = /^(\d{1,2})[/.-](\d{1,2})$/.exec(t); if (n) m = [0, new Date().getFullYear(), n[1], n[2]]; }
  if (!m) return null;
  const iso = `${m[1]}-${String(m[2]).padStart(2, "0")}-${String(m[3]).padStart(2, "0")}`;
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) || d.getMonth() + 1 !== Number(m[2]) ? null : iso;
}
function toTime(s) {
  const t = String(s).trim().replace(/[：]/g, ":").replace(/時(\d{1,2})分?$/, ":$1").replace(/時$/, ":00");
  const m = /^(\d{1,2}):(\d{2})$/.exec(t);
  return m && +m[1] < 24 && +m[2] < 60 ? `${m[1].padStart(2, "0")}:${m[2]}` : null;
}
el.pasteGo.addEventListener("click", () => {
  const lines = el.paste.value.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return showMsgs(el.msgs, [["warn", "貼り付ける欄が空です。予定を1行に1件ずつ貼り付けてから、「行に追加する」を押してください。"]]);
  let added = 0;
  const unread = [], over = []; // 読み取れなかった行・上限で入らなかった行（欄に残して、直してもう一度押せるようにする）
  for (const line of lines) {
    if (rows.length >= MAX_ROWS) { over.push(line); continue; }
    let parts = line.split("\t");
    if (parts.length < 2) parts = line.split(/\s*[,，]\s*/);
    // 「10:00〜11:00」のように、1つの欄に開始と終了が入っていたら分ける
    parts = parts.flatMap((p) => (/^\s*\d{1,2}[:：]\d{2}\s*[〜~\-－ー]\s*\d{1,2}[:：]\d{2}\s*$/.test(p) ? p.split(/[〜~\-－ー]/) : [p]));
    const r = blank();
    let k = 0;
    const d = parts[k] !== undefined ? toIsoDate(parts[k]) : null;
    if (d) { r.date = d; k++; }
    const s = parts[k] !== undefined ? toTime(parts[k]) : null;
    if (s) { r.start = s; k++; }
    const en = parts[k] !== undefined ? toTime(parts[k]) : null;
    if (en) { r.end = en; k++; }
    [r.title, r.who, r.note] = [parts[k] ?? "", parts[k + 1] ?? "", parts.slice(k + 2).join(" ")].map((v) => v.trim());
    if (!r.date && rows.length) r.date = rows[rows.length - 1].date;
    if (isEmpty(r)) { unread.push(line); continue; }
    Object.assign(r, clean(r), { id: r.id });
    rows.push(r);
    added++;
  }
  el.paste.value = [...unread, ...over].join("\n");
  drawRows();
  save();
  const msgs = [];
  if (added) msgs.push(["ok", `${added}件を追加しました。日付や時刻が正しい欄に入っているか、確かめてください。`]);
  if (unread.length) msgs.push(["warn", `${added ? `${unread.length}行は` : ""}予定として読み取れませんでした。日付のほかに、時刻か内容が入っているか確かめてください。読み取れなかった行は、貼り付ける欄に残しています。`]);
  if (over.length) msgs.push(["warn", `予定は${MAX_ROWS}行まで入れられるため、${over.length}行は追加していません。使わない行を削除するか、表を分けて作ってください。追加していない行は、貼り付ける欄に残しています。`]);
  showMsgs(el.msgs, msgs);
});

/* ---------- プレビュー（Excelと同じ sheet model から描く） ---------- */
const WEEK = "日月火水木金土";
function fmt(c) {
  if (!c) return "";
  if (c.t === "date") {
    const d = new Date(Date.UTC(1899, 11, 30) + c.v * 86400000);
    const y = d.getUTCFullYear(), m = d.getUTCMonth() + 1, day = d.getUTCDate(), w = WEEK[d.getUTCDay()];
    return c.s === "bandDate" ? `${y}年${m}月${day}日(${w})` : `${y}/${m}/${day}(${w})`;
  }
  if (c.t === "time") { const mins = Math.round(c.v * 1440); return `${Math.floor(mins / 60)}:${String(mins % 60).padStart(2, "0")}`; }
  if (c.t === "f") return c.v === "" || c.v === undefined ? "" : `${c.v}分`;
  return String(c.v ?? "");
}
function entries() {
  return rows.filter((r) => !isEmpty(r)).map(({ id, ...r }) => ({ ...r, title: r.title.trim(), who: r.who.trim(), note: r.note.trim() }));
}
const docTitle = () => el.title.value.trim() || "スケジュール";
const note = () => { const d = new Date(); return `作成日：${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`; };
function model() {
  return getTemplate(tpl.get()).build(entries(), { title: docTitle(), note: note() });
}

function preview() {
  const list = entries();
  el.prevWrap.hidden = list.length === 0;
  el.saved.hidden = list.length === 0 && !el.title.value;
  const warns = rows.map((r, i) => (r.start && r.end && r.end < r.start ? `${i + 1}行目は、終了の時刻が開始より前になっています。時刻を確かめてください。` : null)).filter(Boolean);
  showMsgs(el.msgs, warns.slice(0, 3).map((w) => ["warn", w]));
  if (!list.length) { el.prev.innerHTML = ""; return; }
  const m = model();
  const merged = new Set(m.merges.map((r) => Number(r.match(/\d+/)[0])));
  const n = m.cols.length;
  el.prev.innerHTML = `<table><tbody>${m.rows.map((row, ri) => {
    const r = ri + 1;
    const first = row.cells[0];
    if (r === 1) return `<tr class="title"><td colspan="${n}">${esc(fmt(first))}</td></tr>`;
    if (r === 2) return `<tr class="note"><td colspan="${n}">${esc(fmt(first))}</td></tr>`;
    if (row.cells.every((c) => c?.s === "head")) return `<tr>${row.cells.map((c) => `<th>${esc(fmt(c))}</th>`).join("")}</tr>`;
    if (merged.has(r)) return `<tr class="band"><td colspan="${n}">${esc(fmt(first))}</td></tr>`;
    return `<tr>${row.cells.map((c) => `<td class="${c?.s === "wrap" ? "wrap" : ["date", "time", "minutes", "center"].includes(c?.s) ? "c" : ""}">${esc(fmt(c))}</td>`).join("")}</tr>`;
  }).join("")}</tbody></table>`;
}

/* ---------- 書き出し ---------- */
el.xlsx.addEventListener("click", async () => {
  if (!entries().length) return showMsgs(el.msgs, [["err", "保存する予定がまだありません。「予定を追加」から1件以上入れてください。"]]);
  try {
    const blob = await buildXlsx(model());
    download(blob, `${safeName(docTitle(), "スケジュール")}_${stamp()}.xlsx`);
    flash(el.xlsx, "保存しました");
  } catch (e) {
    showMsgs(el.msgs, [["err", "Excelファイルを作れませんでした。ページを読み込み直して、もう一度お試しください。"]]);
  }
});
el.csv.addEventListener("click", () => {
  if (!entries().length) return showMsgs(el.msgs, [["err", "保存する予定がまだありません。「予定を追加」から1件以上入れてください。"]]);
  download(new Blob([toCsv(entries())], { type: "text/csv;charset=utf-8" }), `${safeName(docTitle(), "スケジュール")}_${stamp()}.csv`);
  flash(el.csv, "保存しました");
});
function resetAll() {
  if (entries().length >= 3 && !window.confirm("入力した予定と表のタイトルを、すべて消します。よろしいですか？")) return;
  rows = [];
  el.title.value = "";
  tpl.set(TEMPLATES[0].id, false);
  el.tplDesc.textContent = TEMPLATES[0].desc;
  try { localStorage.removeItem(KEY); } catch (e) {}
  drawRows();
  showMsgs(el.msgs, []);
  el.add.focus();
}
el.reset.addEventListener("click", resetAll);
el.resetAll.addEventListener("click", resetAll); // 一時保存の表示の横：予定が0件でタイトルだけのときも消せるように

load();
drawRows();
