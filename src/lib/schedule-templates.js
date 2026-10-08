/* ===========================================================
   スケジュール → Excel の「テンプレート」
   入力された予定（entries）から、Excelのシートの形（sheet model。書き方は src/lib/xlsx.js）を作る。
   プレビューも同じ sheet model から描くので、画面とExcelの中身がずれない。

   ★ 会社ごとの専用フォーマットにするときは、TEMPLATES に1件足すだけでよい。
     build() が返す行・列・書式を変えれば、画面側（src/scripts/tools/schedule.js）は触らなくて済む。

   entry: { date: "2026-10-01", start: "10:00", end: "11:30", title, who, note }
   =========================================================== */
import { dateSerial, timeSerial, colName } from "./xlsx.js";

const txt = (v, s = "cell") => ({ v: v ?? "", s });
const date = (v, s = "date") => { const n = dateSerial(v); return n === null ? txt(v ? String(v) : "", "center") : { v: n, t: "date", s }; };
const time = (v) => { const n = timeSerial(v); return n === null ? txt(v || "", "center") : { v: n, t: "time", s: "time" }; };
/* 所要時間（分）。開始・終了の両方があるときだけ、Excel の式で出す（あとで時刻を直しても合う） */
const minutes = (e, row, startCol, endCol) => {
  const a = timeSerial(e.start), b = timeSerial(e.end);
  if (a === null || b === null || b < a) return txt("", "minutes");
  return { t: "f", f: `ROUND((${endCol}${row}-${startCol}${row})*1440,0)`, v: Math.round((b - a) * 1440), s: "minutes" };
};

const byDateTime = (a, b) => (a.date || "9999").localeCompare(b.date || "9999") || (a.start || "99").localeCompare(b.start || "99");

/* 見出し行とタイトル行をつくる（どのテンプレートでも同じ） */
function frame(title, heads, widths, note) {
  const n = heads.length;
  const rows = [
    { height: 28, cells: [txt(title, "title"), ...Array(n - 1).fill(null)] },
    { cells: [txt(note, "note"), ...Array(n - 1).fill(null)] },
    { height: 22, cells: heads.map((h) => txt(h, "head")) },
  ];
  return { rows, merges: [`A1:${colName(n - 1)}1`, `A2:${colName(n - 1)}2`], cols: widths.map((width) => ({ width })) };
}
/* 日付や担当ごとの区切り行（横いっぱいに結合） */
function band(model, cell) {
  const n = model.cols.length;
  const r = model.rows.length + 1;
  model.rows.push({ height: 22, cells: [cell, ...Array(n - 1).fill(0).map(() => txt("", "band"))] });
  model.merges.push(`A${r}:${colName(n - 1)}${r}`);
}

export const TEMPLATES = [
  {
    id: "list",
    label: "一覧表",
    desc: "画面に並んでいる順のまま、1件を1行にして出します。",
    build(entries, { title, note }) {
      const m = frame(title, ["日付", "開始", "終了", "内容", "担当", "備考"], [16, 8, 8, 40, 14, 32], note);
      for (const e of entries) m.rows.push({ cells: [date(e.date), time(e.start), time(e.end), txt(e.title, "wrap"), txt(e.who), txt(e.note, "wrap")] });
      return { ...m, name: "予定", freeze: 3, filter: "A3:F3", printTitles: 3, landscape: true, title };
    },
  },
  {
    id: "timetable",
    label: "進行表",
    desc: "日付ごとに区切り、時間順に並べて所要時間も出します。イベント当日の進行に向いています。",
    build(entries, { title, note }) {
      const m = frame(title, ["開始", "終了", "所要", "内容", "担当", "備考"], [8, 8, 8, 44, 14, 32], note);
      let cur = null;
      for (const e of [...entries].sort(byDateTime)) {
        if (e.date !== cur) { cur = e.date; band(m, e.date ? date(e.date, "bandDate") : txt("日付なし", "band")); }
        const r = m.rows.length + 1;
        m.rows.push({ cells: [time(e.start), time(e.end), minutes(e, r, "A", "B"), txt(e.title, "wrap"), txt(e.who), txt(e.note, "wrap")] });
      }
      return { ...m, name: "進行表", freeze: 3, printTitles: 3, landscape: true, title };
    },
  },
  {
    id: "person",
    label: "担当別",
    desc: "担当者ごとにまとめ、日付順に並べます。それぞれの担当者に配るときに向いています。",
    build(entries, { title, note }) {
      const m = frame(title, ["日付", "開始", "終了", "内容", "備考"], [16, 8, 8, 44, 36], note);
      const groups = new Map();
      for (const e of [...entries].sort(byDateTime)) {
        const k = (e.who || "").trim() || "担当なし";
        if (!groups.has(k)) groups.set(k, []);
        groups.get(k).push(e);
      }
      for (const [who, list] of groups) {
        band(m, txt(`${who}（${list.length}件）`, "band"));
        for (const e of list) m.rows.push({ cells: [date(e.date), time(e.start), time(e.end), txt(e.title, "wrap"), txt(e.note, "wrap")] });
      }
      return { ...m, name: "担当別", freeze: 3, printTitles: 3, landscape: true, title };
    },
  },
];

export const getTemplate = (id) => TEMPLATES.find((t) => t.id === id) || TEMPLATES[0];

/* CSV は表計算ソフトで読み直しやすいよう、テンプレートによらず1行1件の平らな形にする */
export function toCsv(entries) {
  const q = (v) => {
    const s = String(v ?? "");
    return /[",\r\n]/.test(s) || /^[=+\-@\t\r]/.test(s) ? `"${(/^[=+\-@\t\r]/.test(s) ? "'" : "") + s.replace(/"/g, '""')}"` : s;
  };
  const lines = [["日付", "開始", "終了", "内容", "担当", "備考"], ...entries.map((e) => [e.date ? e.date.replace(/-/g, "/") : "", e.start, e.end, e.title, e.who, e.note])];
  // 先頭の BOM で、Excel で開いても日本語が文字化けしない
  return "﻿" + lines.map((r) => r.map(q).join(",")).join("\r\n") + "\r\n";
}
