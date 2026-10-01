/* ===========================================================
   PDFばらし屋（/pdf-extract/）
   PDFを選ぶ → テキスト／画像／ページ画像を取り出す → コピー・保存・ZIP
   読み取りは src/lib/pdf-extract.js（pdf.js は PDF を選んだときに初めて読み込む）
   =========================================================== */
import { $, $$, esc, svg, download, copyText, showMsgs, safeName, flash } from "./common.js";
import { makeZip } from "../../lib/zip.js";

const MAX_MB = 300;

const el = {
  pick: $('[data-stage="pick"]'),
  work: $('[data-stage="work"]'),
  drop: $("#pdf-drop"),
  file: $("#pdf-file"),
  pass: $("#pdf-pass"),
  pickMsgs: $("#pdf-pick-msgs"),
  name: $("#pdf-name"),
  meta: $("#pdf-meta"),
  reset: $("#pdf-reset"),
  acts: $$(".pdfx-act"),
  zip: $(".pdfx-zip"),
  prog: $("#pdf-prog"),
  progT: $("#pdf-prog-t"),
  progBar: $("#pdf-prog .prog-bar i"),
  cancel: $("#pdf-cancel"),
  msgs: $("#pdf-msgs"),
  out: $("#pdf-out"),
};

let lib = null;         // src/lib/pdf-extract.js（あとから読み込む）
let state = null;       // { file, data, doc, pages, base, text, images, pageImgs, scale }
let busy = false;
let cancelled = false;
let urls = [];          // 作った blob: URL（あとで返す）
let view = null;        // いま見ている結果（text / images / pages）

const fmtSize = (b) => (b >= 1048576 ? (b / 1048576).toFixed(1) + "MB" : Math.max(1, Math.round(b / 1024)) + "KB");
const pad = (n) => String(n).padStart(Math.max(2, String(state?.pages || 0).length), "0");
const objUrl = (blob) => { const u = URL.createObjectURL(blob); urls.push(u); return u; };

/* ---------- ファイルを受け取る ---------- */
// ページのどこに落としても、ブラウザがPDFを開いてこのページから離れないようにする
["dragover", "drop"].forEach((t) => window.addEventListener(t, (e) => { if (e.dataTransfer?.types?.includes("Files")) e.preventDefault(); }));
el.drop.addEventListener("dragenter", (e) => { e.preventDefault(); el.drop.classList.add("over"); });
el.drop.addEventListener("dragover", (e) => { e.preventDefault(); el.drop.classList.add("over"); });
el.drop.addEventListener("dragleave", (e) => { if (!el.drop.contains(e.relatedTarget)) el.drop.classList.remove("over"); });
el.drop.addEventListener("drop", (e) => {
  e.preventDefault();
  el.drop.classList.remove("over");
  const files = [...(e.dataTransfer?.files || [])];
  if (files.length > 1) showMsgs(el.pickMsgs, [["info", "1つずつ読み取ります。最初のファイルを開きました。"]]);
  if (files[0]) take(files[0]);
});
el.file.addEventListener("change", () => { if (el.file.files[0]) take(el.file.files[0]); el.file.value = ""; });

async function take(file) {
  showMsgs(el.pickMsgs, []);
  el.pass.hidden = true;
  if (!/\.pdf$/i.test(file.name) && file.type !== "application/pdf") return showMsgs(el.pickMsgs, [["err", "PDFファイル（.pdf）を選んでください。"]]);
  if (file.size === 0) return showMsgs(el.pickMsgs, [["err", "ファイルが空です（0バイト）。別のファイルでお試しください。"]]);
  if (file.size > MAX_MB * 1048576) return showMsgs(el.pickMsgs, [["err", `${MAX_MB}MBまでのPDFにしてください（このファイルは${fmtSize(file.size)}）。`]]);
  let data;
  try {
    data = await file.arrayBuffer();
  } catch (e) {
    return showMsgs(el.pickMsgs, [["err", "ファイルを読み込めませんでした。もう一度選び直してください。"]]);
  }
  // 中身の先頭が %PDF- でなければ、拡張子が .pdf でもPDFではない
  const head = new TextDecoder("latin1").decode(new Uint8Array(data, 0, Math.min(1024, data.byteLength)));
  if (!head.includes("%PDF-")) return showMsgs(el.pickMsgs, [["err", "PDFとして読めないファイルです。壊れているか、別の形式のファイルかもしれません。"]]);
  await open(file, data);
}

async function open(file, data, password) {
  setBusy(true, "PDFを開いています…");
  try {
    lib ||= await import("../../lib/pdf-extract.js");
    // pdf.js は受け取ったデータを worker に渡して使えなくするので、写しを渡す（パスワードの入れ直し用に元を残す）
    const { doc, close } = await lib.openPdf(data.slice(0), password);
    state = { file, data, doc, close, pages: doc.numPages, base: safeName(file.name.replace(/\.pdf$/i, ""), "pdf"), text: null, images: null, pageImgs: null, scale: 2, imgFormat: "png" };
    el.name.textContent = file.name;
    el.meta.textContent = `${doc.numPages}ページ ・ ${fmtSize(file.size)}`;
    el.pick.hidden = true;
    el.work.hidden = false;
    el.pass.hidden = true;
    showMsgs(el.msgs, doc.numPages > 150 ? [["info", `${doc.numPages}ページあります。ページの画像化やZIPは時間がかかるので、必要なものだけ取り出すのがおすすめです。`]] : []);
  } catch (e) {
    if (lib && e instanceof lib.PdfPasswordError) {
      el.pass.hidden = false;
      el.pass._pending = { file, data };
      const inp = $("input", el.pass);
      inp.value = "";
      inp.setAttribute("aria-invalid", String(e.wrong));
      showMsgs(el.pickMsgs, e.wrong ? [["err", "パスワードがちがいます。もう一度入れてください。"]] : []);
      inp.focus();
    } else if (e?.name === "InvalidPDFException") {
      showMsgs(el.pickMsgs, [["err", "PDFの中身が壊れているため、開けませんでした。"]]);
    } else if (!lib) {
      showMsgs(el.pickMsgs, [["err", "読み取りの準備ができませんでした。通信の状態を確かめて、ページを読み込み直してください。"]]);
    } else {
      showMsgs(el.pickMsgs, [["err", "このPDFは開けませんでした。別のPDFでお試しください。"]]);
    }
  } finally {
    setBusy(false);
  }
}

el.pass.addEventListener("submit", (e) => {
  e.preventDefault();
  const p = el.pass._pending;
  const pw = $("input", el.pass).value;
  if (p && pw) open(p.file, p.data, pw);
});

/* ---------- 取り出す ---------- */
function setBusy(on, text = "") {
  busy = on;
  el.prog.hidden = !on || !state;
  el.progT.textContent = text;
  el.progBar.style.width = "0%";
  [...el.acts, el.zip, el.reset].forEach((b) => { b.disabled = on; });
  if (on) cancelled = false;
}
function progress(text, done, total) {
  el.progT.textContent = text;
  el.progBar.style.width = total ? `${Math.round((done / total) * 100)}%` : "0%";
}
el.cancel.addEventListener("click", () => { cancelled = true; el.progT.textContent = "中止しています…"; });
class Cancelled extends Error {}
const check = () => { if (cancelled) throw new Cancelled(); };

async function getText() {
  if (state.text) return state.text;
  const list = [];
  for (let n = 1; n <= state.pages; n++) {
    check();
    progress(`文字を読み取っています… ${n} / ${state.pages}ページ`, n - 1, state.pages);
    try { list.push(await lib.pageText(state.doc, n)); } catch (e) { list.push(null); }
  }
  return (state.text = list);
}

async function getImages() {
  if (state.images) return state.images;
  const list = [];
  const seen = new Set();
  const note = { small: 0, large: 0, failed: 0, failedPages: 0 };
  for (let n = 1; n <= state.pages; n++) {
    check();
    progress(`画像を探しています… ${n} / ${state.pages}ページ`, n - 1, state.pages);
    try {
      const r = await lib.pageImages(state.doc, n, seen);
      for (const k of ["small", "large", "failed"]) note[k] += r.skipped[k];
      r.images.forEach((img, i) => list.push({ ...img, page: n, stem: `page-${pad(n)}-image-${String(i + 1).padStart(2, "0")}` }));
    } catch (e) { note.failedPages++; }
  }
  state.images = list;
  state.imagesNote = note;
  return list;
}

/* 画像の保存形式。JPEG を選んでも、透明な部分がある画像と、PNG のほうが軽い画像は PNG のまま */
function imageFile(img) {
  const jpg = state.imgFormat === "jpeg" && img.opaque && img.jpeg && img.jpeg.size < img.blob.size;
  return jpg ? { blob: img.jpeg, name: img.stem + ".jpg" } : { blob: img.blob, name: img.stem + ".png" };
}

async function setImageFormat(fmt) {
  if (!state?.images || busy || fmt === state.imgFormat) return;
  setBusy(true, "準備しています…");
  showMsgs(el.msgs, []);
  try {
    if (fmt === "jpeg") {
      const targets = state.images.filter((img) => img.opaque && !img.jpeg && !img.jpegFailed);
      for (let k = 0; k < targets.length; k++) {
        check();
        progress(`JPEGにしています… ${k + 1} / ${targets.length}枚`, k, targets.length);
        try { targets[k].jpeg = await lib.toJpeg(targets[k].blob); } catch (e) { targets[k].jpegFailed = true; }
      }
    }
    state.imgFormat = fmt;
    drawImages();
  } catch (e) {
    if (e instanceof Cancelled) showMsgs(el.msgs, [["info", "中止しました。PNGのままです。"]]);
    else showMsgs(el.msgs, [["err", "JPEGにできませんでした。PNGのまま保存してください。"]]);
  } finally {
    setBusy(false);
    updateActs();
  }
}

async function getPages() {
  if (state.pageImgs) return state.pageImgs;
  const list = [];
  for (let n = 1; n <= state.pages; n++) {
    check();
    progress(`ページを画像にしています… ${n} / ${state.pages}ページ`, n - 1, state.pages);
    try {
      const r = await lib.renderPage(state.doc, n, state.scale);
      list.push({ ...r, page: n, name: `page-${pad(n)}.png` });
    } catch (e) {
      list.push({ page: n, failed: true });
    }
  }
  return (state.pageImgs = list);
}

async function run(kind) {
  if (!state || busy) return;
  setBusy(true, "準備しています…");
  showMsgs(el.msgs, []);
  try {
    if (kind === "text") await getText();
    if (kind === "images") await getImages();
    if (kind === "pages") await getPages();
    view = kind;
    draw();
  } catch (e) {
    if (e instanceof Cancelled) showMsgs(el.msgs, [["info", "中止しました。もう一度押すと、最初からやり直します。"]]);
    else showMsgs(el.msgs, [["err", "取り出している途中で問題が起きました。ページを読み込み直して、もう一度お試しください。"]]);
  } finally {
    setBusy(false);
    updateActs();
  }
}

async function runZip() {
  if (!state || busy) return;
  setBusy(true, "準備しています…");
  showMsgs(el.msgs, []);
  try {
    const text = await getText();
    const images = await getImages();
    const pages = await getPages();
    check();
    progress("ZIPにまとめています…", 1, 1);
    const files = [];
    const all = text.map((t, i) => `===== ${i + 1}ページ =====\n${t ?? "（読み取れませんでした）"}`).join("\n\n");
    files.push({ name: `text/all.txt`, data: all + "\n" });
    text.forEach((t, i) => files.push({ name: `text/${pad(i + 1)}.txt`, data: (t ?? "") + "\n" }));
    images.forEach((img) => { const f = imageFile(img); files.push({ name: `images/${f.name}`, data: f.blob, compress: false }); });
    pages.filter((p) => !p.failed).forEach((p) => files.push({ name: `pages/${p.name}`, data: p.blob, compress: false }));
    const zip = await makeZip(files);
    download(zip, `${state.base}_pdf_extract.zip`);
    updateActs();
    if (!view) { view = "text"; draw(); }
    showMsgs(el.msgs, [["ok", `ZIPを保存しました（テキスト${text.length}ページ・画像${images.length}枚・ページ画像${pages.filter((p) => !p.failed).length}枚）。`]]);
  } catch (e) {
    if (e instanceof Cancelled) showMsgs(el.msgs, [["info", "中止しました。取り出し終わった分は残っています。"]]);
    else showMsgs(el.msgs, [["err", "ZIPを作れませんでした。ページ数が多い場合は、テキストだけ・画像だけに分けてお試しください。"]]);
  } finally {
    setBusy(false);
    updateActs();
  }
}

el.acts.forEach((b) => b.addEventListener("click", () => {
  const k = b.dataset.act;
  if (state?.[k === "text" ? "text" : k === "images" ? "images" : "pageImgs"]) { view = k; draw(); updateActs(); }
  else run(k);
}));
el.zip.addEventListener("click", runZip);

function updateActs() {
  const counts = {
    text: state?.text ? `${state.text.filter((t) => t).length}p` : "",
    images: state?.images ? `${state.images.length}枚` : "",
    pages: state?.pageImgs ? `${state.pageImgs.filter((p) => !p.failed).length}枚` : "",
  };
  el.acts.forEach((b) => {
    b.setAttribute("aria-pressed", String(b.dataset.act === view));
    const n = $(".pdfx-n", b);
    n.textContent = counts[b.dataset.act];
    n.hidden = !counts[b.dataset.act];
  });
}

/* ---------- 表示 ---------- */
function draw() {
  if (view === "text") drawText();
  if (view === "images") drawImages();
  if (view === "pages") drawPages();
}

function drawText() {
  const t = state.text;
  const chars = t.reduce((s, x) => s + (x ? x.replace(/\s/g, "").length : 0), 0);
  const all = t.map((x, i) => `===== ${i + 1}ページ =====\n${x ?? ""}`).join("\n\n");
  const empty = chars === 0;
  el.out.innerHTML = `
    <div class="out-head">
      <div>
        <p class="out-t">テキスト <b>${t.length}</b>ページ分</p>
        <p class="out-d">${chars.toLocaleString()}文字（空白をのぞく）</p>
      </div>
      <div class="acts">
        <button type="button" class="btn btn-primary" data-do="copy-all" ${empty ? "disabled" : ""}>${svg("copy", 15)}全文をコピー</button>
        <button type="button" class="btn btn-ghost" data-do="save-all" ${empty ? "disabled" : ""}>${svg("download", 15)}.txtで保存</button>
        <button type="button" class="btn btn-ghost" data-do="zip-text" ${empty ? "disabled" : ""}>${svg("zip", 15)}ページごとにZIP</button>
      </div>
    </div>
    ${empty ? `<p class="msg warn">${svg("warn", 15)}<span>文字が見つかりませんでした。スキャンしたPDFや、文字が画像になっているPDFかもしれません。「ページを画像化」なら画像として取り出せます。</span></p>` : ""}
    <div class="pdfx-pages">
      ${t.map((x, i) => `
        <section class="pdfx-pg">
          <div class="pdfx-pg-h">
            <h3 class="pdfx-pg-t">${i + 1}ページ<small>${x ? x.replace(/\s/g, "").length.toLocaleString() + "文字" : ""}</small></h3>
            ${x ? `<button type="button" class="btn btn-ghost btn-sm" data-do="copy-page" data-i="${i}">${svg("copy", 14)}コピー</button>` : ""}
          </div>
          <div class="pdfx-txt${x ? "" : " none"}">${x ? esc(x) : x === null ? "このページは読み取れませんでした。" : "このページに文字はありません。"}</div>
        </section>`).join("")}
    </div>`;
  el.out._all = all;
}

function figs(list, pageMode) {
  return `<div class="pdfx-grid">${list.map((img, i) => img.failed
    ? `<figure class="pdfx-fig"><div class="pdfx-thumb page"><span class="pdfx-cap">読み取れませんでした</span></div><figcaption class="pdfx-cap">${img.page}ページ</figcaption></figure>`
    : `<figure class="pdfx-fig">
        <div class="pdfx-thumb${pageMode ? " page" : ""}"><img src="${objUrl(img.blob)}" alt="${pageMode ? `${img.page}ページの画像` : `${img.page}ページの画像${i + 1}`}" loading="lazy" decoding="async" width="${img.width}" height="${img.height}" /></div>
        <figcaption class="pdfx-cap"><span>${pageMode ? `${img.page}ページ` : `p.${img.page}`} ・ ${img.width}×${img.height}${img.file ? `<br>${img.name.endsWith(".jpg") ? "JPEG" : "PNG"} ${fmtSize(img.file.size)}` : ""}</span>
          <button type="button" class="icon-btn" data-do="save-one" data-i="${i}" aria-label="${esc(img.name)} を保存">${svg("download", 17)}</button></figcaption>
      </figure>`).join("")}</div>`;
}

function drawImages() {
  const note = state.imagesNote || {};
  const jpeg = state.imgFormat === "jpeg";
  // 表示と保存に使う形（サムネイルは元の PNG、保存するのは選んだ形式）
  const list = state.images.map((img) => { const f = imageFile(img); return { ...img, file: f.blob, name: f.name }; });
  const total = list.reduce((s, img) => s + img.file.size, 0);
  const keptPng = jpeg ? list.filter((img) => img.name.endsWith(".png")).length : 0;
  // のぞいた画像は、理由ごとに数を出す
  const skipped = [
    note.small && `小さすぎる画像（線や点など）${note.small}件`,
    note.large && `大きすぎて処理できない画像${note.large}件`,
    note.failed && `読み取れなかった画像${note.failed}件`,
  ].filter(Boolean);
  const notes = [
    skipped.length && [note.large || note.failed ? "warn" : "info", `のぞいたもの：${skipped.join("・")}`],
    note.failedPages && ["warn", `${note.failedPages}ページは、画像を読み取れませんでした。`],
    keptPng && ["info", `透明な部分がある画像と、PNGのほうが軽い画像（${keptPng}枚）は、PNGのままにしています。`],
  ].filter(Boolean);
  el.out.innerHTML = `
    <div class="out-head">
      <div>
        <p class="out-t">画像 <b>${list.length}</b>枚</p>
        <p class="out-d">PDFに貼られている写真・イラストを、1枚ずつ取り出しました${list.length ? `（合計 ${fmtSize(total)}）` : ""}</p>
      </div>
      <div class="acts">
        ${list.length ? `<div class="pick" role="group" aria-label="保存の形式">
          <button type="button" data-fmt="png" aria-pressed="${!jpeg}">PNG（劣化なし）</button>
          <button type="button" data-fmt="jpeg" aria-pressed="${jpeg}">JPEG（軽い）</button>
        </div>` : ""}
        <button type="button" class="btn btn-primary" data-do="zip-images" ${list.length ? "" : "disabled"}>${svg("zip", 15)}画像をまとめてZIP</button>
      </div>
    </div>
    ${notes.length ? `<div class="msgs" style="margin-bottom:var(--g-sm)">${notes.map(([k, t]) => `<p class="msg ${k}">${svg(k === "warn" ? "warn" : "info", 15)}<span>${esc(t)}</span></p>`).join("")}</div>` : ""}
    ${list.length ? figs(list, false) : `<p class="msg info">${svg("info", 15)}<span>取り出せる画像はありませんでした。ページ全体を画像にしたいときは「ページを画像化」を使ってください。</span></p>`}`;
  el.out._list = list;
}

function drawPages() {
  const list = state.pageImgs;
  const ok = list.filter((p) => !p.failed);
  el.out.innerHTML = `
    <div class="out-head">
      <div>
        <p class="out-t">ページ画像 <b>${ok.length}</b>枚</p>
        <p class="out-d">見たままのページを PNG にしました</p>
      </div>
      <div class="acts">
        <div class="pick" role="group" aria-label="画質">
          <button type="button" data-scale="2" aria-pressed="${state.scale === 2}">標準</button>
          <button type="button" data-scale="4" aria-pressed="${state.scale === 4}">高画質</button>
        </div>
        <button type="button" class="btn btn-primary" data-do="zip-pages" ${ok.length ? "" : "disabled"}>${svg("zip", 15)}まとめてZIP</button>
      </div>
    </div>
    ${figs(list, true)}`;
  el.out._list = list;
}

el.out.addEventListener("click", async (e) => {
  const b = e.target.closest("[data-do], [data-scale], [data-fmt]");
  if (!b || busy) return;
  if (b.dataset.fmt) return setImageFormat(b.dataset.fmt);
  if (b.dataset.scale) {
    const s = Number(b.dataset.scale);
    if (s === state.scale) return;
    state.scale = s;
    state.pageImgs = null;
    return run("pages");
  }
  const d = b.dataset.do;
  if (d === "copy-all") copyText(el.out._all, b);
  if (d === "copy-page") copyText(state.text[Number(b.dataset.i)] || "", b);
  if (d === "save-all") download(new Blob([el.out._all + "\n"], { type: "text/plain;charset=utf-8" }), `${state.base}.txt`);
  if (d === "save-one") { const it = el.out._list[Number(b.dataset.i)]; const blob = it?.file || it?.blob; if (blob) download(blob, `${state.base}_${it.name}`); }
  if (d === "zip-text") {
    const files = state.text.map((t, i) => ({ name: `text/${pad(i + 1)}.txt`, data: (t ?? "") + "\n" }));
    download(await makeZip(files), `${state.base}_text.zip`);
    flash(b, "保存しました");
  }
  if (d === "zip-images" || d === "zip-pages") {
    const dir = d === "zip-images" ? "images" : "pages";
    const files = d === "zip-images"
      ? state.images.map((img) => { const f = imageFile(img); return { name: `${dir}/${f.name}`, data: f.blob, compress: false }; })
      : state.pageImgs.filter((p) => !p.failed).map((p) => ({ name: `${dir}/${p.name}`, data: p.blob, compress: false }));
    download(await makeZip(files), `${state.base}_${dir}.zip`);
    flash(b, "保存しました");
  }
});

/* ---------- リセット ---------- */
el.reset.addEventListener("click", () => {
  if (busy) return;
  state?.close?.().catch(() => {});
  state = null;
  view = null;
  urls.forEach((u) => URL.revokeObjectURL(u));
  urls = [];
  el.out.innerHTML = el.out._empty;
  el.work.hidden = true;
  el.pick.hidden = false;
  showMsgs(el.msgs, []);
  showMsgs(el.pickMsgs, []);
  updateActs();
  el.file.focus();
});
el.out._empty = el.out.innerHTML;
