/* ===========================================================
   あと何日？ — 画面の動き
   ・タイマーは1つだけ（1秒ごと）。残り時間は毎回「期限 − Date.now()」で計算し直し、変わったところだけ書き換える
   ・データは localStorage（キー atonannichi.v1）だけ。壊れていても止まらない（壊れた中身は .broken に退避）
   ・ユーザーが入れた文字は textContent で入れる（HTML として解釈させない）
   =========================================================== */
import {
  DAY, HOUR, MIN, WD, STORE_KEY, VERSION, pad2, sod, ymd, md, uid, dueAt, parts, ptext,
  view, notice, formulas, toTsv, toCsv, parseBulk, normalize, tidy, samples,
} from "../../lib/deadline.js";
import { $, copyText, download, reduceMotion } from "./common.js";

const root = $("#an");
if (root) init();

function init() {
  /* ---------- 要素 ---------- */
  const el = {
    clock: $("#an-clock"), install: $("#an-install"), miniBtn: $("#an-mini-btn"),
    nwrap: $("#an-nwrap"), notice: $("#an-notice"), nmsg: $("#an-nmsg"), nsub: $("#an-nsub"), later: $("#an-later"), live: $("#an-live"),
    mini: $("#an-mini"), mlist: $("#an-mlist"), mempty: $("#an-mempty"), mcount: $("#an-mcount"), mnext: $("#an-mnext"),
    full: $("#an-full"), dlN: $("#an-dl-n"), open: $("#an-open"), samples: $("#an-samples"), clearSamples: $("#an-clear-samples"),
    backup: $("#an-backup"), backupT: $("#an-backup-t"), backupNo: $("#an-backup-no"), backupYes: $("#an-backup-yes"),
    composer: $("#an-composer"), cmodeT: $("#an-cmode-t"), mode: $("#an-mode"), one: $("#an-one"), bulk: $("#an-bulk"),
    title: $("#an-title"), dchips: $("#an-dchips"), date: $("#an-date"), tchips: $("#an-tchips"), time: $("#an-time"),
    eg: $("#an-eg"), bulkIn: $("#an-bulk-in"), bres: $("#an-bres"), preview: $("#an-preview"), cancel: $("#an-cancel"), submit: $("#an-submit"),
    cards: $("#an-cards"), empty: $("#an-empty"), first: $("#an-first"),
    done: $("#an-done"), dtoggle: $("#an-dtoggle"), dn: $("#an-dn"), dlist: $("#an-dlist"),
    todayBtn: $("#an-today-btn"), tdate: $("#an-tdate"), tcount: $("#an-tcount"), tbody: $("#an-tbody"), tbar: $("#an-tbar"),
    task: $("#an-task"), tasks: $("#an-tasks"), alldone: $("#an-alldone"), notasks: $("#an-notasks"),
    tsv: $("#an-tsv"), csv: $("#an-csv"), store: $("#an-store"), toast: $("#an-toast"), toastT: $("#an-toast-t"), undo: $("#an-undo"),
  };
  const motion = !reduceMotion();
  const standalone = () => window.matchMedia?.("(display-mode: standalone)").matches || navigator.standalone === true;
  if (standalone()) document.documentElement.classList.add("an-app");
  const baseTitle = document.title;
  // タブ名は残り時間で変わるので、アクセス解析（GA）にはページ本来のタイトルだけを送る
  window.gtag?.("set", { page_title: baseTitle });

  /* ---------- 保存 ---------- */
  let canStore = true;
  function load() {
    let raw = null;
    try { raw = localStorage.getItem(STORE_KEY); } catch (e) { canStore = false; return null; }
    if (!raw) return null;
    try { return JSON.parse(raw); }
    catch (e) {
      try { localStorage.setItem(STORE_KEY + ".broken", raw); } catch (e2) {} // 読めない中身は消さずに退避
      return null;
    }
  }
  function persist() {
    if (!canStore) return;
    try { localStorage.setItem(STORE_KEY, JSON.stringify({ version: VERSION, tasks: data.tasks, deadlines: data.deadlines, ui: data.ui })); }
    catch (e) { canStore = false; renderStoreNote(); }
  }

  const t0 = Date.now();
  const stored = load();
  let data = stored ? tidy(normalize(stored, t0), t0) : { ...normalize(null, t0), ...samples(t0) };
  if (!stored) data.ui.mini = standalone(); // アプリとして開いた初回はミニから
  const ui = { composer: false, mode: "one", dDate: "", dTime: "23:59", showDone: false, noticeOff: "", fresh: null, fx: new Set(), bip: null, lastDay: ymd(t0) };

  /* ---------- 小さな道具 ---------- */
  const h = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  const setText = (n, t) => { if (n.textContent !== t) n.textContent = t; };
  const replay = (n, cls) => { if (!motion) return; n.classList.remove(cls); void n.offsetWidth; n.classList.add(cls); clearTimeout(n["_" + cls]); n["_" + cls] = setTimeout(() => n.classList.remove(cls), 1000); };
  const own = () => data.deadlines.filter((d) => !d.sample);
  const hasSamples = () => data.tasks.some((t) => t.sample) || data.deadlines.some((d) => d.sample);
  const snap = () => ({ tasks: [...data.tasks], deadlines: [...data.deadlines] });
  function dropSamples() {
    if (!hasSamples()) return null;
    const prev = snap();
    data.tasks = data.tasks.filter((t) => !t.sample);
    data.deadlines = data.deadlines.filter((d) => !d.sample);
    return prev;
  }
  const ICON = {
    check: '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M2.5 6.2l2.3 2.3 4.7-5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    trash: '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M2 3.2h8M4.6 3.2V2h2.8v1.2M3.2 3.2l.5 6.8h4.6l.5-6.8" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    fx: '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><rect x="1.5" y="1.5" width="9" height="9" rx="1.5" stroke="currentColor" stroke-width="1.2"/><path d="M1.5 4.5h9M4.5 4.5v6" stroke="currentColor" stroke-width="1.2"/></svg>',
    x: '<svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true"><path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    tick: '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M2.5 6.2l2.3 2.3 4.7-5" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  };

  /* キーごとに要素を使い回して、並び順だけ合わせる（毎回作り直さない） */
  function sync(box, items, map, make, update) {
    const keep = new Set(items.map((x) => x.id));
    for (const [id, n] of map) if (!keep.has(id)) { if (n.contains(document.activeElement)) focusAfter = true; n.remove(); map.delete(id); }
    let prev = null;
    for (const it of items) {
      let n = map.get(it.id);
      if (!n) { n = make(it); map.set(it.id, n); }
      update(n, it);
      const want = prev ? prev.nextSibling : box.firstChild;
      if (want !== n) box.insertBefore(n, want);
      prev = n;
    }
  }
  let focusAfter = false; // フォーカスしていた行が消えたら、近くのボタンへ移す

  /* ---------- トースト（削除は確認なし。5秒「元に戻す」） ---------- */
  let toastTimer, undoSnap = null;
  function toast(msg, undo) {
    clearTimeout(toastTimer);
    undoSnap = undo || null;
    el.toastT.textContent = msg;
    el.undo.hidden = !undo;
    el.toast.hidden = false;
    toastTimer = setTimeout(() => { el.toast.hidden = true; undoSnap = null; }, 5000);
  }
  el.undo.addEventListener("click", () => {
    if (undoSnap) { data.tasks = undoSnap.tasks; data.deadlines = undoSnap.deadlines; persist(); renderAll(); }
    undoSnap = null; el.toast.hidden = true;
  });

  /* ---------- 締切のカード ---------- */
  const cardEls = new Map();
  function makeCard(c) {
    const n = h("article", "an-card");
    n.dataset.id = c.d.id;
    n.tabIndex = -1; // 完了を押したあと、はんこを見せているあいだフォーカスを置いておく場所
    n.innerHTML = `<div class="an-ctop2"><span class="an-pill"><span class="an-dot"></span><span data-r="pill"></span></span><span class="an-smp" data-r="smp" hidden>サンプル</span><span class="an-date" data-r="date"></span></div>
<h3 class="an-ttl" data-r="title"></h3>
<div class="an-left" data-r="left"></div><div class="an-bar" data-r="barw" aria-hidden="true"><i data-r="bar"></i></div>
<div class="an-over" data-r="over" hidden><b>期限オーバー</b><span data-r="overt"></span></div>
<div class="an-acts"><button type="button" class="an-act" data-a="done">${ICON.check}完了</button><button type="button" class="an-act" data-a="fx" aria-expanded="false">${ICON.fx}Excelで計算</button><button type="button" class="an-act is-del" data-a="del">${ICON.trash}</button></div>
<div class="an-fx" data-r="fx" hidden></div>`;
    const t = c.d.title;
    n.querySelector('[data-r="title"]').textContent = t;
    n.querySelector('[data-a="done"]').setAttribute("aria-label", `「${t}」を完了にする`);
    n.querySelector('[data-a="fx"]').setAttribute("aria-label", `「${t}」の期限をExcel・スプレッドシートで計算する関数`);
    n.querySelector('[data-a="del"]').setAttribute("aria-label", `「${t}」を削除`);
    n.querySelector('[data-a="del"]').title = "削除";
    if (ui.fresh === c.d.id) replay(n, "is-in");
    return n;
  }
  function updateCard(n, c) {
    const { d, v, featured } = c, prev = n._v;
    const q = (r) => n.querySelector(`[data-r="${r}"]`);
    if (n.dataset.st !== v.st) {
      n.dataset.st = v.st;
      if (prev) replay(n, v.st === "over" ? "is-nudge" : "is-settle");
    }
    n.classList.toggle("is-featured", featured);
    n.classList.toggle("is-done", d.done);
    setText(q("pill"), v.pill);
    setText(q("date"), v.dateLabel);
    q("smp").hidden = !d.sample;
    q("left").hidden = q("barw").hidden = v.over;
    q("over").hidden = !v.over;
    if (!prev || prev.short !== v.short) {
      const left = q("left");
      left.replaceChildren(h("span", "an-ato", "あと"), ...v.parts.map((p) => { const s = h("span", "an-p"); s.append(h("span", "an-n", String(p.v)), h("span", "an-u", p.u)); return s; }));
      if (prev && prev.g !== v.g) replay(v.over ? q("over") : left, "is-flip");
    }
    if (prev && prev.over !== v.over) replay(q("over"), "is-flip");
    setText(q("overt"), v.overText);
    const w = (v.bar * 100).toFixed(2) + "%";
    if (q("bar").style.width !== w) q("bar").style.width = w;
    // 完了のはんこ
    let st = n.querySelector(".an-stamp");
    if (d.done && !st) {
      st = h("div", "an-stamp"); st.setAttribute("aria-hidden", "true");
      const t = new Date(d.doneAt); st.append(h("b", null, "完了"), h("span", null, `${t.getMonth() + 1}.${t.getDate()}`));
      n.append(st);
    }
    n.querySelectorAll("button").forEach((b) => (b.disabled = d.done));
    // Excel の関数（開いているときだけ中身を作る）
    const fx = q("fx"), open = ui.fx.has(d.id) && !d.done;
    n.querySelector('[data-a="fx"]').setAttribute("aria-expanded", String(open));
    if (open && fx.hidden) {
      fx.replaceChildren(...formulas(d.dueDate).map((f) => {
        const r = h("div", "an-fxr");
        const l = h("span", "an-fxl", f.label);
        if (f.note) l.append(h("small", null, f.note));
        const b = h("button", "an-fxb", "コピー"); b.type = "button"; b.dataset.code = f.code; b.setAttribute("aria-label", `${f.label}の関数をコピー`);
        r.append(l, h("code", "an-fxc", f.code), b);
        return r;
      }), h("p", "an-fxn", "Excel・Googleスプレッドシートのどちらでも使えます。"));
    }
    fx.hidden = !open;
    n._v = v;
  }
  el.cards.addEventListener("click", async (e) => {
    const b = e.target.closest("button"); if (!b) return;
    const id = b.closest(".an-card")?.dataset.id; if (!id) return;
    if (b.dataset.code) {
      const ok = await copyText(b.dataset.code, b);
      if (ok !== false) { b.classList.add("is-ok"); setTimeout(() => b.classList.remove("is-ok"), 1600); }
      return;
    }
    const a = b.dataset.a;
    if (a === "fx") { ui.fx.has(id) ? ui.fx.delete(id) : ui.fx.add(id); renderDeadlines(); }
    if (a === "done") {
      b.closest(".an-card").focus({ preventScroll: true });
      data.deadlines = data.deadlines.map((d) => (d.id === id ? { ...d, done: true, doneAt: Date.now() } : d));
      persist(); renderAll();
      setTimeout(renderAll, 1500); // はんこを見せてから、完了リストへ
    }
    if (a === "del") {
      const prev = snap(); const d = data.deadlines.find((x) => x.id === id);
      data.deadlines = data.deadlines.filter((x) => x.id !== id);
      persist(); renderAll(); toast(`「${d?.title ?? ""}」を削除しました`, prev);
    }
  });

  /* ---------- 締切の一覧・お知らせ・ミニ ---------- */
  let live = []; // まだ完了していない締切（近い順）
  let lastNoticeKey = null, lastDoneSig = "";
  function renderDeadlines(now = Date.now()) {
    const sorted = [...data.deadlines].sort((a, b) => a.dueDate - b.dueDate);
    const act = sorted.filter((d) => !d.done || now - d.doneAt < 1400);
    const doneArr = sorted.filter((d) => d.done && now - d.doneAt >= 1400).sort((a, b) => b.doneAt - a.doneAt);
    const cards = act.map((d, i) => ({ id: d.id, d, v: view(d, now), featured: i === 0 && !d.done }));
    live = cards.filter((c) => !c.d.done).map((c) => ({ id: c.id, title: c.d.title, v: c.v, sample: c.d.sample }));
    sync(el.cards, cards, cardEls, makeCard, updateCard);
    if (focusAfter) { focusAfter = false; (el.cards.querySelector('[data-a="done"]:not(:disabled)') || el.open).focus(); }
    setText(el.dlN, `${live.length}件`);
    el.empty.hidden = cards.length > 0 || ui.composer;
    el.samples.hidden = !hasSamples();
    // 完了した締切
    el.done.hidden = !doneArr.length;
    setText(el.dn, String(doneArr.length));
    el.dtoggle.setAttribute("aria-expanded", String(ui.showDone));
    el.dlist.hidden = !ui.showDone;
    const sig = doneArr.map((d) => d.id).join() + ui.showDone;
    if (sig !== lastDoneSig) {
      lastDoneSig = sig;
      el.dlist.replaceChildren(...doneArr.map((d) => {
        const li = h("li");
        const s = h("span", "an-sumi", "済"); s.setAttribute("aria-hidden", "true");
        const b = h("button", null, "戻す"); b.type = "button"; b.dataset.id = d.id; b.setAttribute("aria-label", `「${d.title}」を戻す`);
        li.append(s, h("span", "an-dt", d.title), h("small", null, md(d.doneAt) + " 完了"), b);
        return li;
      }));
    }
    // バックアップの声かけ（自分の締切が5件になったら一度だけ）
    const ownN = own().length;
    el.backup.hidden = !(canStore && !data.ui.backupAsked && ownN >= 5);
    if (!el.backup.hidden) setText(el.backupT, `締切が${ownN}件になりました。`);
    renderNotice(); renderMini(); renderTitle();
  }
  function renderNotice() {
    const n = notice(live);
    el.nwrap.hidden = ui.noticeOff === n.key;
    if (el.notice.dataset.st !== n.st) el.notice.dataset.st = n.st;
    setText(el.nmsg, n.msg); setText(el.nsub, n.sub);
    el.later.hidden = !n.dismissable;
    el.later.dataset.key = n.key;
    if (n.key !== lastNoticeKey) {
      if (lastNoticeKey !== null) { replay(el.notice, "is-in"); el.live.textContent = n.msg; } // 読み上げは状態が変わったときだけ
      lastNoticeKey = n.key;
    }
  }
  const miniEls = new Map();
  function renderMini() {
    sync(el.mlist, live, miniEls, (c) => {
      const li = h("li");
      const dot = h("span", "an-dot"); dot.style.cssText = "width:7px;height:7px;flex:none;border-radius:50%;background:var(--dot)";
      li.append(dot, h("span", "an-mt", c.title), h("span", "an-mshort"));
      return li;
    }, (li, c) => { li.dataset.st = c.v.st; setText(li.lastChild, c.v.short); });
    el.mempty.hidden = live.length > 0;
  }
  // タブ名（タスクバー）とアプリのバッジ：自分の締切があるとき・アプリで開いたときだけ（サンプルを検索エンジンのタイトルにしない）
  // タブ名には残り時間だけを出し、締切の名前は入れない（タイトルは計測タグや画面の録画に渡ることがあるため）
  let lastBadge = -1;
  function renderTitle() {
    const mine = live.filter((c) => !c.sample);
    const show = mine.length ? mine : standalone() ? live : [];
    const c = show[0];
    const t = c ? `${c.v.st === "over" ? "期限オーバー" : c.v.short} | あと何日？` : baseTitle;
    if (document.title !== t) document.title = t;
    const badge = standalone() ? show.filter((x) => x.v.st === "urgent" || x.v.st === "over").length : 0;
    if (badge !== lastBadge && "setAppBadge" in navigator) {
      lastBadge = badge;
      try { (badge ? navigator.setAppBadge(badge) : navigator.clearAppBadge()).catch(() => {}); } catch (e) {}
    }
  }
  el.later.addEventListener("click", () => { ui.noticeOff = el.later.dataset.key; renderNotice(); });
  el.dtoggle.addEventListener("click", () => { ui.showDone = !ui.showDone; renderDeadlines(); });
  el.dlist.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-id]"); if (!b) return;
    data.deadlines = data.deadlines.map((d) => (d.id === b.dataset.id ? { ...d, done: false, doneAt: 0 } : d));
    persist(); renderAll();
  });
  el.clearSamples.addEventListener("click", () => { const prev = dropSamples(); if (prev) { persist(); renderAll(); toast("サンプルを片付けました", prev); } });

  /* ---------- 締切を追加 ---------- */
  const DCHIPS = () => {
    const t = sod(Date.now()), dow = new Date(t).getDay();
    const at = (n) => new Date(t + n * DAY + 2 * HOUR); // 夏時間のある地域でも日がずれないよう、少し進めて日付を取る
    const list = [["今日", 0], ["明日", 1], ["明後日", 2]];
    const toFri = (5 - dow + 7) % 7 || 7, toMon = (1 - dow + 7) % 7 || 7;
    if (toFri > 2) list.push([`金曜 ${at(toFri).getMonth() + 1}/${at(toFri).getDate()}`, toFri]);
    if (toMon > 2) list.push([`来週月曜 ${at(toMon).getMonth() + 1}/${at(toMon).getDate()}`, toMon]);
    return list.map(([label, n]) => [label, ymd(at(n))]);
  };
  const TCHIPS = ["12:00", "15:00", "18:00", "23:59"];
  function chip(label, v, pressed, time) {
    const b = h("button", "an-chip" + (time ? " is-time" : ""), label); b.type = "button"; b.dataset.v = v; b.setAttribute("aria-pressed", String(pressed));
    return b;
  }
  function renderComposer() {
    el.composer.hidden = !ui.composer;
    if (!ui.composer) return;
    const bulk = ui.mode === "bulk";
    el.one.hidden = bulk; el.bulk.hidden = !bulk;
    setText(el.cmodeT, bulk ? "まとめて貼り付け" : "1件ずつ入れる");
    setText(el.mode, bulk ? "1件ずつ入れる" : "Notion・Excelからまとめて貼り付け");
    // ボタンは日付が変わったときだけ作り直す（押したボタンからフォーカスが外れないように）
    const dl = DCHIPS(), sig = dl.map((x) => x.join()).join();
    if (el.dchips.dataset.sig !== sig) { el.dchips.dataset.sig = sig; el.dchips.replaceChildren(...dl.map(([l, v]) => chip(l, v, false))); }
    if (!el.tchips.children.length) el.tchips.replaceChildren(...TCHIPS.map((v) => chip(v, v, false, true)));
    for (const c of el.dchips.children) c.setAttribute("aria-pressed", String(c.dataset.v === ui.dDate));
    for (const c of el.tchips.children) c.setAttribute("aria-pressed", String(c.dataset.v === ui.dTime));
    if (el.date.value !== ui.dDate) el.date.value = ui.dDate;
    if (el.time.value !== ui.dTime) el.time.value = ui.dTime;
    renderPreview();
  }
  function renderPreview(now = Date.now()) {
    if (!ui.composer) return;
    let text, cls = "", ok;
    if (ui.mode === "bulk") {
      const r = parseBulk(el.bulkIn.value, now);
      el.bres.replaceChildren();
      if (r.ok.length) el.bres.append(h("b", null, `${r.ok.length}件を追加できます。`));
      if (r.bad.length) el.bres.append(h("span", "is-bad", ` ${r.bad.slice(0, 3).map((b) => b.line + "行目").join("・")}${r.bad.length > 3 ? " ほか" : ""}は日付が読めませんでした。`));
      text = r.ok.length ? `${r.ok.length}件` : "貼り付けてください"; cls = r.ok.length ? "" : "is-mute"; ok = r.ok.length > 0;
    } else {
      const due = dueAt(ui.dDate, ui.dTime);
      if (!due) { text = "日付を選んでください"; cls = "is-mute"; }
      else if (due < now) { text = "その日時は過ぎています"; cls = "is-past"; }
      else text = "あと " + ptext(parts(due - now).p);
      ok = !!due && !!el.title.value.trim();
    }
    setText(el.preview, text); el.preview.className = cls;
    el.submit.setAttribute("aria-disabled", String(!ok));
  }
  function openComposer() {
    if (data.ui.mini) { data.ui.mini = false; persist(); renderChrome(); }
    ui.composer = true; ui.mode = "one"; ui.dDate = ymd(sod(Date.now()) + DAY + 2 * HOUR); ui.dTime = "23:59";
    el.title.value = ""; el.title.removeAttribute("aria-invalid"); el.bulkIn.value = "";
    renderComposer(); renderDeadlines();
    el.title.focus({ preventScroll: true });
    el.composer.scrollIntoView?.({ block: "nearest", behavior: motion ? "smooth" : "auto" });
  }
  function closeComposer() { ui.composer = false; renderComposer(); renderDeadlines(); el.open.focus(); }
  function addDeadlines(list) {
    const now = Date.now();
    const prev = dropSamples();
    const made = list.map((x) => ({ id: uid(), title: x.title, dueDate: x.dueDate, createdAt: Math.min(now, x.dueDate - HOUR), done: false, doneAt: 0, sample: false }));
    data.deadlines = [...data.deadlines, ...made];
    ui.fresh = made.length === 1 ? made[0].id : null;
    ui.composer = false;
    persist(); renderComposer(); renderAll();
    ui.fresh = null;
    if (made.length > 1) toast(`${made.length}件の締切を追加しました`, prev || snapWithout(made));
    else if (prev) toast("サンプルを片付けました", prev);
    el.open.focus();
  }
  const snapWithout = (made) => { const ids = new Set(made.map((m) => m.id)); return { tasks: [...data.tasks], deadlines: data.deadlines.filter((d) => !ids.has(d.id)) }; };
  function submit() {
    if (ui.mode === "bulk") {
      const r = parseBulk(el.bulkIn.value, Date.now());
      if (!r.ok.length) { el.bulkIn.focus(); return; }
      return addDeadlines(r.ok);
    }
    const title = el.title.value.trim().slice(0, 120);
    const due = dueAt(ui.dDate, ui.dTime);
    if (!title) { el.title.setAttribute("aria-invalid", "true"); replay(el.title, "is-nudge"); el.title.focus(); return; }
    if (!due) { el.date.focus(); return; }
    addDeadlines([{ title, dueDate: due }]);
  }
  el.open.addEventListener("click", openComposer);
  el.first.addEventListener("click", openComposer);
  el.cancel.addEventListener("click", closeComposer);
  el.submit.addEventListener("click", submit);
  el.title.addEventListener("input", () => { el.title.removeAttribute("aria-invalid"); renderPreview(); });
  el.composer.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { e.preventDefault(); closeComposer(); }
    if (e.key === "Enter" && !e.isComposing && e.target === el.title) { e.preventDefault(); submit(); }
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && e.target === el.bulkIn) { e.preventDefault(); submit(); }
  });
  el.dchips.addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) { ui.dDate = b.dataset.v; renderComposer(); } });
  el.tchips.addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) { ui.dTime = b.dataset.v; renderComposer(); } });
  el.date.addEventListener("change", () => { ui.dDate = el.date.value; renderComposer(); });
  el.time.addEventListener("change", () => { ui.dTime = el.time.value || "23:59"; renderComposer(); });
  el.bulkIn.addEventListener("input", () => renderPreview());
  el.mode.addEventListener("click", () => {
    ui.mode = ui.mode === "bulk" ? "one" : "bulk";
    if (ui.mode === "bulk") {
      const y = new Date().getFullYear(), m = new Date().getMonth() + 1, d2 = (n) => `${y}-${pad2(m)}-${pad2(n)}`;
      el.eg.textContent = `サイト公開\t${d2(28)}\n原稿確認\t${d2(20)} 18:00\n見積提出, 10月31日`;
    }
    renderComposer();
    (ui.mode === "bulk" ? el.bulkIn : el.title).focus();
  });

  /* ---------- 今日やること ---------- */
  const taskEls = new Map();
  let countPulse = 0;
  function renderTasks(now = Date.now()) {
    const today = ymd(now);
    const vis = data.tasks.filter((t) => !t.completed || ymd(t.completedAt) === today);
    const ord = (t) => (t.completed && now - t.completedAt > 800 ? 1 : 0);
    const list = vis.map((t, i) => ({ t, i })).sort((a, b) => ord(a.t) - ord(b.t) || a.i - b.i).map(({ t }) => ({ id: t.id, t }));
    sync(el.tasks, list, taskEls, ({ t }) => {
      const li = h("li", "an-task");
      li.innerHTML = `<button type="button" class="an-chk">${ICON.tick}</button><span class="an-tx"><span></span><i></i></span><span class="an-tag" hidden></span><button type="button" class="an-x" title="削除">${ICON.x}</button>`;
      li.querySelector(".an-tx span").textContent = t.text;
      li.querySelector(".an-chk").setAttribute("aria-label", `「${t.text}」を完了にする`);
      li.querySelector(".an-x").setAttribute("aria-label", `「${t.text}」を削除`);
      if (ui.fresh === t.id) replay(li, "is-in");
      return li;
    }, (li, { t }) => {
      li.dataset.id = t.id;
      li.classList.toggle("is-done", t.completed);
      const c = li.querySelector(".an-chk");
      if (c.getAttribute("aria-pressed") !== String(t.completed)) { c.setAttribute("aria-pressed", String(t.completed)); if (t.completed && now - t.completedAt < 600) replay(c, "is-pop"); }
      const tag = t.sample ? "サンプル" : !t.completed && t.day < today ? "持ち越し" : "";
      const tg = li.querySelector(".an-tag"); tg.hidden = !tag; setText(tg, tag);
    });
    if (focusAfter) { focusAfter = false; el.task.focus(); }
    const doneN = vis.filter((t) => t.completed).length;
    const dNow = new Date(now);
    setText(el.tdate, `${dNow.getMonth() + 1}/${dNow.getDate()}(${WD[dNow.getDay()]})`);
    el.tcount.innerHTML = `${doneN}<small> / ${vis.length}</small>`;
    el.tcount.setAttribute("aria-label", `${vis.length}件中${doneN}件完了`);
    if (now - countPulse < 500) replay(el.tcount, "is-pop");
    el.tbar.style.width = vis.length ? (doneN / vis.length) * 100 + "%" : "0%";
    el.alldone.hidden = !(vis.length && doneN === vis.length);
    el.notasks.hidden = vis.length > 0;
    const next = vis.find((t) => !t.completed);
    setText(el.mcount, `今日 ${doneN}/${vis.length}`);
    setText(el.mnext, next ? "次：" + next.text : vis.length ? "ぜんぶ完了" : "予定なし");
  }
  function addTask() {
    const text = el.task.value.trim().slice(0, 120); if (!text) return;
    const now = Date.now(), prev = dropSamples();
    const t = { id: uid(), text, completed: false, createdAt: now, completedAt: 0, day: ymd(now), sample: false };
    data.tasks = [t, ...data.tasks];
    el.task.value = "";
    ui.fresh = t.id; persist(); renderAll(); ui.fresh = null;
    if (prev) toast("サンプルを片付けました", prev);
  }
  el.task.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.isComposing) { e.preventDefault(); addTask(); } });
  el.tasks.addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    const id = b.closest(".an-task")?.dataset.id;
    if (b.classList.contains("an-chk")) {
      const now = Date.now(); countPulse = now;
      data.tasks = data.tasks.map((t) => (t.id === id ? { ...t, completed: !t.completed, completedAt: t.completed ? 0 : now } : t));
      persist(); renderTasks();
      setTimeout(() => renderTasks(), 850); // 線を引いてから、下へ
    } else if (b.classList.contains("an-x")) {
      const prev = snap(); const t = data.tasks.find((x) => x.id === id);
      data.tasks = data.tasks.filter((x) => x.id !== id);
      persist(); renderAll(); toast(`「${t?.text ?? ""}」を削除しました`, prev);
    }
  });
  el.todayBtn.addEventListener("click", () => { data.ui.todayOpen = !data.ui.todayOpen; persist(); renderChrome(); });

  /* ---------- 書き出し ---------- */
  el.tsv.addEventListener("click", async () => {
    const list = own().filter((d) => !d.done).sort((a, b) => a.dueDate - b.dueDate);
    if (!list.length) return toast(hasSamples() ? "まだ自分の締切がありません（サンプルはコピーしません）" : "コピーする締切がありません");
    const ok = await copyText(toTsv(list), null);
    toast(ok === false ? "コピーできませんでした。ブラウザの設定をご確認ください" : `${list.length}件をコピーしました。Notion・Excelに貼り付けできます`);
  });
  function exportCsv() {
    const list = own();
    if (!list.length) return toast("書き出す締切がありません");
    download(new Blob([toCsv(list)], { type: "text/csv" }), `締切一覧_${ymd(Date.now())}.csv`);
    toast("Excel用に書き出しました（開くたび残り日数が更新されます）");
  }
  el.csv.addEventListener("click", exportCsv);
  el.backupYes.addEventListener("click", () => { data.ui.backupAsked = true; persist(); exportCsv(); renderDeadlines(); });
  el.backupNo.addEventListener("click", () => { data.ui.backupAsked = true; persist(); renderDeadlines(); });

  /* ---------- ミニ・開閉・保存の案内 ---------- */
  function renderChrome() {
    root.classList.toggle("is-mini", data.ui.mini);
    el.mini.hidden = !data.ui.mini;
    el.miniBtn.setAttribute("aria-pressed", String(data.ui.mini));
    el.todayBtn.setAttribute("aria-expanded", String(data.ui.todayOpen));
    el.tbody.hidden = !data.ui.todayOpen;
  }
  el.miniBtn.addEventListener("click", () => { data.ui.mini = !data.ui.mini; persist(); renderChrome(); });
  function renderStoreNote() {
    setText(el.store, canStore ? "データはこのブラウザの中だけに保存されます" : "このブラウザでは保存できないため、ページを閉じると消えます");
  }

  /* ---------- 時計と、時間の経過（タイマーは1つ） ---------- */
  function renderClock(now) {
    const d = new Date(now), blink = motion && d.getSeconds() % 2;
    setText(el.clock, `${d.getMonth() + 1}月${d.getDate()}日(${WD[d.getDay()]}) ${pad2(d.getHours())}${blink ? " " : ":"}${pad2(d.getMinutes())}`);
  }
  function tick() {
    const now = Date.now();
    renderClock(now);
    if (ymd(now) !== ui.lastDay) { // 日付が変わった：完了済みを片づけて、今日の欄を作り直す
      ui.lastDay = ymd(now);
      data = tidy(data, now); persist(); renderTasks(now);
      if (ui.composer) renderComposer();
    }
    renderDeadlines(now);
    renderPreview(now);
  }
  function renderAll() { renderChrome(); renderDeadlines(); renderTasks(); }

  /* ---------- キーボード：N＝締切を追加／T＝今日やることへ ---------- */
  window.addEventListener("keydown", (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey || e.repeat || e.isComposing) return;
    const tag = (e.target.tagName || "").toLowerCase();
    if (tag === "input" || tag === "textarea" || tag === "select" || e.target.isContentEditable) return;
    if (e.key === "n" || e.key === "N") { e.preventDefault(); openComposer(); }
    if (e.key === "t" || e.key === "T") {
      e.preventDefault();
      data.ui.mini = false; data.ui.todayOpen = true; persist(); renderChrome();
      el.task.focus();
    }
  });

  /* ---------- ほかのタブで変えたとき・画面に戻ったとき ---------- */
  window.addEventListener("storage", (e) => {
    if (e.key !== STORE_KEY) return;
    try { data = tidy(normalize(JSON.parse(e.newValue || "null"), Date.now()), Date.now()); renderAll(); } catch (x) {}
  });
  document.addEventListener("visibilitychange", () => { if (!document.hidden) tick(); });

  /* ---------- アプリとして置く（PWA） ---------- */
  window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); ui.bip = e; el.install.hidden = standalone(); });
  window.addEventListener("appinstalled", () => { ui.bip = null; el.install.hidden = true; });
  el.install.addEventListener("click", async () => {
    const e = ui.bip; if (!e) return;
    e.prompt();
    try { await e.userChoice; } catch (x) {}
    ui.bip = null; el.install.hidden = true;
  });
  if ("serviceWorker" in navigator && import.meta.env.PROD) {
    navigator.serviceWorker.register("/deadline/sw.js", { scope: "/deadline/" }).catch(() => {});
  }

  renderStoreNote();
  renderAll();
  renderClock(Date.now());
  root.classList.add("is-ready"); // ここで本体を見せる（CSS の .an:not(.is-ready)）
  setInterval(tick, 1000);
}
