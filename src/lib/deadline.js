/* ===========================================================
   あと何日？ — 時間の計算・表示の言い方・貼り付けの読み取り・保存データの整理
   画面（DOM）には触らない。動きは src/scripts/tools/deadline.js
   残り時間は毎回「期限 − いまの時刻」で出す（タイマーで足し算しない）
   =========================================================== */

export const DAY = 864e5, HOUR = 36e5, MIN = 6e4;
export const WD = ["日", "月", "火", "水", "木", "金", "土"];
export const STORE_KEY = "atonannichi.v1";
export const VERSION = 1;
const MAX_ITEMS = 300;
const MAX_TEXT = 120;

export const pad2 = (n) => String(n).padStart(2, "0");
/** その日の 0:00 */
export const sod = (t) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
export const ymd = (t) => { const d = new Date(t); return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; };
export const md = (t) => { const d = new Date(t); return `${d.getMonth() + 1}月${d.getDate()}日(${WD[d.getDay()]})`; };
export const hm = (t) => { const d = new Date(t); return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`; };
export const uid = () => (globalThis.crypto?.randomUUID ? crypto.randomUUID().slice(0, 12) : Math.random().toString(36).slice(2, 11));

/* ---------- 期限の日時 ----------
   日付だけなら、その日の 23:59:59 まで（ローカル時刻）。23:59 を選んだときも 59秒まで含める */
export function dueAt(dateStr, timeStr) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr || "");
  if (!m) return null;
  const [h, mi] = /^\d{1,2}:\d{2}$/.test(timeStr || "") ? timeStr.split(":").map(Number) : [23, 59];
  const d = new Date(+m[1], +m[2] - 1, +m[3], h, mi, h === 23 && mi === 59 ? 59 : 0, 0);
  // 2月30日 などは別の日にずれるので、はじく
  if (d.getFullYear() !== +m[1] || d.getMonth() !== +m[2] - 1 || d.getDate() !== +m[3] || h > 23 || mi > 59) return null;
  return d.getTime();
}
/** 時刻が「その日いっぱい（23:59）」か */
export const isEndOfDay = (t) => { const d = new Date(t); return d.getHours() === 23 && d.getMinutes() === 59; };

/* ---------- 残り時間の言い方（日 → 時間 → 分） ----------
   7日以上「8日」／1〜7日「2日14時間」／10〜24時間「18時間」／1〜10時間「9時間12分」／1時間未満「48分」 */
export function parts(diff) {
  const d = Math.floor(diff / DAY), h = Math.floor((diff % DAY) / HOUR), m = Math.floor((diff % HOUR) / MIN);
  if (d >= 7) return { g: "d", p: [{ v: d, u: "日" }] };
  if (d >= 1) return { g: "dh", p: h ? [{ v: d, u: "日" }, { v: h, u: "時間" }] : [{ v: d, u: "日" }] };
  if (h >= 10) return { g: "h", p: [{ v: h, u: "時間" }] };
  if (h >= 1) return { g: "hm", p: m ? [{ v: h, u: "時間" }, { v: m, u: "分" }] : [{ v: h, u: "時間" }] };
  if (m >= 1) return { g: "m", p: [{ v: m, u: "分" }] };
  return { g: "s", p: [{ v: 1, u: "分未満" }] };
}
export const ptext = (p) => p.map((x) => x.v + x.u).join("");
/** 期限を過ぎてからの時間 */
export function elapsed(diff) {
  const d = Math.floor(diff / DAY), h = Math.floor((diff % DAY) / HOUR), m = Math.floor((diff % HOUR) / MIN);
  if (d >= 1) return `${d}日${h ? h + "時間" : ""}`;
  if (h >= 1) return `${h}時間${m ? m + "分" : ""}`;
  return `${Math.max(m, 1)}分`;
}

/* ---------- 状態：通常 → 注意（72時間以内）→ 緊急（24時間以内）→ 超過 ---------- */
export const RANK = { over: 0, urgent: 1, caution: 2, normal: 3 };
export function view(d, now) {
  const diff = d.dueDate - now, over = diff < 0;
  const st = over ? "over" : diff <= DAY ? "urgent" : diff <= 3 * DAY ? "caution" : "normal";
  const dd = Math.round((sod(d.dueDate) - sod(now)) / DAY); // カレンダーで何日後か
  let pill = { over: "期限オーバー", urgent: "24時間以内", caution: "まもなく", normal: "余裕あり" }[st];
  if (!over && dd === 0) pill = "今日が期限";
  else if (!over && dd === 1) pill = "明日が期限";
  const pr = over ? null : parts(diff);
  const span = Math.max(d.dueDate - d.createdAt, HOUR);
  return {
    st, pill, dd, over,
    g: pr ? pr.g : "over",
    parts: pr ? pr.p : [],
    short: over ? "期限オーバー" : "あと" + ptext(pr.p),
    overText: over ? `${elapsed(-diff)} 超過` : "",
    bar: Math.max(0, Math.min(1, diff / span)),
    dateLabel: `${md(d.dueDate)} ${hm(d.dueDate)}`,
  };
}

/** お知らせの1行：いちばん近い（いちばん緊急な）締切を代表にする */
export function notice(cards) {
  if (!cards.length) return { st: "normal", key: "none", msg: "いま、締切はありません。", sub: "締切を入れると、ここで残り時間を知らせます", dismissable: false };
  const c = cards[0], t = c.title, v = c.v;
  const near = cards.filter((x) => x.v.st !== "normal").length;
  const more = near > 1 ? `ほか${near - 1}件も近づいています` : "";
  let msg, sub;
  if (v.st === "over") { msg = `「${t}」の期限を過ぎています`; sub = v.overText; }
  else if (v.pill === "今日が期限") { msg = `「${t}」は今日が期限です`; sub = v.short; }
  else if (v.st === "urgent") { msg = `「${t}」まで ${v.short}`; sub = v.pill; }
  else if (v.pill === "明日が期限") { msg = `「${t}」は明日が期限です`; sub = v.short; }
  else if (v.st === "caution") { msg = `「${t}」まで ${v.short}`; sub = ""; }
  else { msg = `次の締切「${t}」まで ${v.short}`; sub = "いいペースです"; }
  if (more) sub = sub ? `${sub} · ${more}` : more;
  return { st: v.st, key: `${c.id}:${v.st}:${v.pill}`, msg, sub, dismissable: v.st !== "normal" };
}

/* ---------- Excel・スプレッドシートの関数（その締切の日付入り） ---------- */
export function formulas(due) {
  const d = new Date(due);
  const DATE = `DATE(${d.getFullYear()},${d.getMonth() + 1},${d.getDate()})`;
  return [
    { label: "今日から期限まで（日）", code: `=${DATE}-TODAY()` },
    { label: "DATEDIFで日数", code: `=DATEDIF(TODAY(),${DATE},"D")`, note: "期限を過ぎるとエラーになります" },
    { label: "残り時間（時間）", code: `=ROUNDDOWN((${DATE}+TIME(${d.getHours()},${d.getMinutes()},0)-NOW())*24,0)` },
    { label: "A2の日付まで（日）", code: "=A2-TODAY()", note: "A2に期限日を入れておく形" },
  ];
}

/* ---------- 書き出し ---------- */
const fmtDate = (t) => ymd(t) + (isEndOfDay(t) ? "" : " " + hm(t));
const oneLine = (s) => String(s).replace(/[\t\r\n]+/g, " ").trim();
/** = + - @ で始まる名前は、Excel・スプレッドシートに貼ったとき数式として動かないよう ' を付ける */
const noFormula = (s) => (/^[=+\-@]/.test(s) ? "'" + s : s);
/** Notion・Excel・スプレッドシートに貼れる「タスク名<TAB>期限」 */
export const toTsv = (deadlines) => deadlines.map((d) => `${noFormula(oneLine(d.title))}\t${fmtDate(d.dueDate)}`).join("\n");

/** 残り日数・状態の関数入り CSV（Excelで開くたびに更新される）。タイトルは数式として動かないようにする */
export function toCsv(deadlines) {
  const q = (v) => '"' + String(v).replace(/"/g, '""') + '"';
  const safe = noFormula;
  const fmt = (t) => { const d = new Date(t); return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${hm(t)}`; };
  const rows = [["締切", "期限", "残り日数", "残り時間", "状態", "完了"]];
  [...deadlines].sort((a, b) => a.dueDate - b.dueDate).forEach((d, i) => {
    const r = i + 2;
    rows.push([safe(oneLine(d.title)), fmt(d.dueDate), `=IF(F${r}="済","",INT(B${r})-TODAY())`, `=IF(F${r}="済","",ROUNDDOWN((B${r}-NOW())*24,0))`,
      `=IF(F${r}="済","完了",IF(B${r}<NOW(),"期限オーバー",IF(B${r}-NOW()<=1,"緊急",IF(B${r}-NOW()<=3,"注意","通常"))))`, d.done ? "済" : ""]);
  });
  return "﻿" + rows.map((r) => r.map(q).join(",")).join("\r\n");
}

/* ---------- まとめて貼り付け（Notion・Excel・スプレッドシート・メモから） ----------
   1行に1件。「タスク名」と「期限」をタブ・カンマ・2つ以上の空白で区切る（順番はどちらでもよい）
   期限は 2026-10-10 / 2026/10/10 / 2026年10月10日 / 10/10 / 10月10日。後ろに 18:00 を付けると時刻も */
const toHalf = (s) => s.replace(/[０-９：／－．，]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0)).replace(/　/g, " ");
export function parseDate(text, now) {
  const s = toHalf(String(text)).trim().replace(/\s*[（(][日月火水木金土][)）]\s*/g, " ").trim();
  let m = /^(\d{4})\s*[-/.年]\s*(\d{1,2})\s*[-/.月]\s*(\d{1,2})\s*日?(?:\s+|T)?(?:(\d{1,2})\s*[:時]\s*(\d{2})?\s*分?)?$/.exec(s);
  let y, mo, d, h, mi;
  if (m) [, y, mo, d, h, mi] = m;
  else {
    m = /^(\d{1,2})\s*[/月]\s*(\d{1,2})\s*日?(?:\s+(\d{1,2})\s*[:時]\s*(\d{2})?\s*分?)?$/.exec(s);
    if (!m) return null;
    [, mo, d, h, mi] = m;
    // 年がないときは今年。30日以上前の日付なら来年のこととみなす
    y = new Date(now).getFullYear();
    const guess = dueAt(`${y}-${pad2(mo)}-${pad2(d)}`);
    if (guess && guess < sod(now) - 30 * DAY) y += 1;
  }
  const time = h != null ? `${pad2(h)}:${pad2(mi || 0)}` : "";
  return dueAt(`${y}-${pad2(mo)}-${pad2(d)}`, time);
}
function splitLine(line) {
  if (line.includes("\t")) return line.split("\t");
  if (/[,，]/.test(line)) {
    // かんたんな CSV（"…" で囲んだカンマは区切らない）
    const out = []; let cur = "", inQ = false;
    for (const ch of line.replace(/，/g, ",")) {
      if (ch === '"') inQ = !inQ;
      else if (ch === "," && !inQ) { out.push(cur); cur = ""; }
      else cur += ch;
    }
    return [...out, cur];
  }
  const wide = line.split(/ {2,}|　+/);
  if (wide.length > 1) return wide;
  // 1つの空白しかないときは、末尾か先頭の日付らしいところで分ける
  const m = /^(.*\S)\s+(\S+(?:\s+\d{1,2}:\d{2})?)$/.exec(line) || [];
  return m.length ? [m[1], m[2]] : [line];
}
export function parseBulk(text, now) {
  const ok = [], bad = [];
  String(text || "").split(/\r?\n/).slice(0, MAX_ITEMS).forEach((raw, i) => {
    const line = raw.trim().slice(0, 400); // 極端に長い行で読み取りが重くならないように
    if (!line) return;
    const cells = splitLine(line).map((c) => c.trim().replace(/^"|"$/g, "")).filter(Boolean);
    let at = -1, due = null;
    for (let j = cells.length - 1; j >= 0; j--) { const t = parseDate(cells[j], now); if (t) { at = j; due = t; break; } }
    if (at < 0 && cells.length === 1) {
      // 「サイト公開 10/10」のように、先頭が日付のことも
      const m = /^(\S+)\s+(.+)$/.exec(cells[0]);
      const t = m && parseDate(m[1], now);
      if (t) return ok.push({ title: m[2].slice(0, MAX_TEXT), dueDate: t });
    }
    const title = cells.filter((_, j) => j !== at).join(" ").slice(0, MAX_TEXT);
    if (due && title) ok.push({ title, dueDate: due });
    else if (i === 0 && cells.length > 1) return; // 1行目が「タスク名 / 期限」のような見出しなら飛ばす
    else bad.push({ line: i + 1, text: line.slice(0, 40) });
  });
  return { ok, bad };
}

/* ---------- 保存データ：読み込み・古い形の変換・壊れたものの除外 ---------- */
const str = (v) => (typeof v === "string" ? v.trim().slice(0, MAX_TEXT) : "");
const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v : typeof v === "string" && v ? Date.parse(v) || NaN : NaN);
export function normalize(raw, now) {
  const src = raw && typeof raw === "object" ? raw : {};
  const tasks = (Array.isArray(src.tasks) ? src.tasks : []).slice(0, MAX_ITEMS).map((t) => {
    if (!t || typeof t !== "object") return null;
    const text = str(t.text);
    if (!text) return null;
    const completed = !!(t.completed ?? t.done);
    const createdAt = num(t.createdAt);
    const completedAt = num(t.completedAt ?? t.doneE ?? t.doneAt);
    return {
      id: str(t.id) || uid(), text, completed,
      createdAt: Number.isFinite(createdAt) ? createdAt : now,
      completedAt: completed && Number.isFinite(completedAt) && completedAt > 0 ? completedAt : completed ? now : 0,
      day: /^\d{4}-\d{2}-\d{2}$/.test(t.day) ? t.day : ymd(Number.isFinite(createdAt) ? createdAt : now),
      sample: !!t.sample,
    };
  }).filter(Boolean);
  const deadlines = (Array.isArray(src.deadlines) ? src.deadlines : []).slice(0, MAX_ITEMS).map((d) => {
    if (!d || typeof d !== "object") return null;
    const title = str(d.title);
    const dueDate = num(d.dueDate ?? d.due);
    if (!title || !Number.isFinite(dueDate)) return null;
    const createdAt = num(d.createdAt ?? d.created);
    const doneAt = num(d.doneAt);
    return {
      id: str(d.id) || uid(), title, dueDate,
      createdAt: Number.isFinite(createdAt) ? Math.min(createdAt, dueDate - HOUR) : Math.min(now, dueDate - HOUR),
      done: !!d.done, doneAt: d.done && Number.isFinite(doneAt) ? doneAt : d.done ? now : 0,
      sample: !!d.sample,
    };
  }).filter(Boolean);
  const ui = src.ui && typeof src.ui === "object" ? src.ui : src; // 試作版は ui を分けずに持っていた
  return { version: VERSION, tasks, deadlines, ui: { mini: !!ui.mini, todayOpen: !!ui.todayOpen, backupAsked: !!ui.backupAsked } };
}

/** 片づけ：前の日までに完了した「今日やること」と、30日より前に完了した締切を消す */
export function tidy(data, now) {
  const today = ymd(now);
  return {
    ...data,
    tasks: data.tasks.filter((t) => !t.completed || ymd(t.completedAt) === today),
    deadlines: data.deadlines.filter((d) => !d.done || now - d.doneAt < 30 * DAY),
  };
}

/* ---------- はじめて開いたときのサンプル（自分の予定を入れると片づく） ---------- */
export function samples(now) {
  const r5 = (t) => Math.round(t / (5 * MIN)) * 5 * MIN;
  const T = (text, done) => ({ id: uid(), text, completed: !!done, createdAt: now - 2 * HOUR, completedAt: done ? now - HOUR : 0, day: ymd(now), sample: true });
  const D = (title, offs, len) => ({ id: uid(), title, dueDate: r5(now + offs), createdAt: now + offs - len, done: false, doneAt: 0, sample: true });
  return {
    tasks: [T("山田さんに確認メール"), T("ワイヤー修正"), T("見積書送付", true)],
    deadlines: [D("見積書の提出", 5 * HOUR + 20 * MIN, 3 * DAY), D("サイト公開", 2 * DAY + 4 * HOUR, 14 * DAY), D("月次レポート", 9 * DAY, 30 * DAY)],
  };
}
