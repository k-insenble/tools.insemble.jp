/* ===========================================================
   PDFばらし屋：pdf.js でPDFを読む（ブラウザの中だけ。ファイルはどこにも送らない）
   このファイルは PDF を選んだときに初めて読み込む（ページを開いただけでは重くしない）
   - 古めの Safari でも動くよう legacy 版を使う
   - cmaps などの付属データは public/pdfjs/（scripts/copy-pdfjs.mjs がコピー）
   =========================================================== */
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import workerUrl from "pdfjs-dist/legacy/build/pdf.worker.min.mjs?url";

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
const BASE = "/pdfjs/";

export class PdfPasswordError extends Error {
  constructor(wrong) { super(wrong ? "パスワードがちがいます" : "パスワードが必要です"); this.wrong = wrong; }
}

/** @param {ArrayBuffer} data  @param {string} [password]  @returns {Promise<{ doc: any, close: () => Promise<void> }>} */
export async function openPdf(data, password) {
  const task = pdfjs.getDocument({
    data: new Uint8Array(data),
    password,
    cMapUrl: BASE + "cmaps/",
    cMapPacked: true,
    standardFontDataUrl: BASE + "standard_fonts/",
    wasmUrl: BASE + "wasm/",
    iccUrl: BASE + "iccs/",
    isEvalSupported: false,
    enableXfa: false,
    verbosity: 0,
  });
  try {
    const doc = await task.promise;
    // v6 では doc.destroy() がないので、読み込みの task ごと片づける
    return { doc, close: () => task.destroy() };
  } catch (e) {
    task.destroy();
    if (e?.name === "PasswordException") throw new PdfPasswordError(e.code === pdfjs.PasswordResponses.INCORRECT_PASSWORD);
    throw e;
  }
}

/* ページの文字。改行は pdf.js の hasEOL（行の終わり）にしたがう */
export async function pageText(doc, n) {
  const page = await doc.getPage(n);
  const tc = await page.getTextContent();
  let s = "";
  for (const it of tc.items) {
    if (!("str" in it)) continue;
    s += it.str;
    if (it.hasEOL) s += "\n";
  }
  page.cleanup();
  return s
    // PDFによっては「日」が部首の文字（⽇ U+2F47 など）で入っている。その範囲だけ普通の漢字に戻す（全角英数などはそのまま）
    .replace(/[\u2E80-\u2FDF]/g, (c) => c.normalize("NFKC"))
    .replace(/[ \t\u00a0]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

const toBlob = (canvas) => new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("画像を作れませんでした"))), "image/png"));

/* Safari の canvas は 約1,670万ピクセルまで。はみ出す大きさなら倍率を下げる */
const MAX_PIXELS = 14_000_000;

/* ページ全体を PNG に。scale 1 = 72dpi */
export async function renderPage(doc, n, scale = 2) {
  const page = await doc.getPage(n);
  let vp = page.getViewport({ scale });
  const px = vp.width * vp.height;
  if (px > MAX_PIXELS) vp = page.getViewport({ scale: scale * Math.sqrt(MAX_PIXELS / px) });
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.floor(vp.width));
  canvas.height = Math.max(1, Math.floor(vp.height));
  await page.render({ canvas, viewport: vp, background: "#ffffff" }).promise;
  const blob = await toBlob(canvas);
  const out = { blob, width: canvas.width, height: canvas.height };
  canvas.width = canvas.height = 0; // メモリをすぐ返す
  page.cleanup();
  return out;
}

/* pdf.js が読み終えた画像のデータを受け取る（来なければ null） */
function getObj(store, id) {
  return new Promise((resolve) => {
    const t = setTimeout(() => resolve(null), 8000);
    try {
      store.get(id, (data) => { clearTimeout(t); resolve(data || null); });
    } catch (e) {
      clearTimeout(t);
      resolve(null);
    }
  });
}

/* 透明な部分があるか（JPEG にすると透明が白で塗られてしまうので、あるものは PNG のままにする）
   大きな画像でも一度にメモリを使いすぎないよう、256行ずつ見て、見つかった時点でやめる */
function hasAlphaOnCanvas(ctx, w, h) {
  for (let y = 0; y < h; y += 256) {
    const d = ctx.getImageData(0, y, w, Math.min(256, h - y)).data;
    for (let i = 3; i < d.length; i += 4) if (d[i] < 255) return true;
  }
  return false;
}

/* pdf.js の画像データ → canvas。返り値 { canvas, opaque } か { reason: "large" | "failed" } */
function imageToCanvas(img) {
  const w = img.width, h = img.height;
  if (!w || !h) return { reason: "failed" };
  if (w * h > MAX_PIXELS) return { reason: "large" };
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (img.bitmap) {
    ctx.drawImage(img.bitmap, 0, 0);
    return { canvas, opaque: !hasAlphaOnCanvas(ctx, w, h) };
  }
  if (!img.data) return { reason: "failed" };
  const out = ctx.createImageData(w, h);
  const d = out.data, src = img.data;
  const K = pdfjs.ImageKind;
  let opaque = true;
  if (img.kind === K.RGBA_32BPP) {
    d.set(src.subarray(0, d.length));
    for (let i = 3; i < d.length; i += 4) if (d[i] < 255) { opaque = false; break; }
  } else if (img.kind === K.RGB_24BPP) {
    for (let i = 0, j = 0; j < d.length; i += 3, j += 4) { d[j] = src[i]; d[j + 1] = src[i + 1]; d[j + 2] = src[i + 2]; d[j + 3] = 255; }
  } else if (img.kind === K.GRAYSCALE_1BPP) {
    // 1ピクセル1ビット、行ごとにバイト単位でそろえてある。1＝白
    const stride = Math.ceil(w / 8);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const on = (src[y * stride + (x >> 3)] >> (7 - (x & 7))) & 1;
      const j = (y * w + x) * 4;
      d[j] = d[j + 1] = d[j + 2] = on ? 255 : 0;
      d[j + 3] = 255;
    }
  } else {
    return { reason: "failed" };
  }
  ctx.putImageData(out, 0, 0);
  return { canvas, opaque };
}

/* ページに貼られている画像を取り出す
   seen：同じ画像（ロゴなど、全ページ共通のもの）を2回出さないための記録
   skipped は、のぞいた画像の数を理由ごとに数えたもの
     small：線や点のような小さすぎる画像／large：大きすぎて処理できない画像／failed：読み取れなかった画像 */
export async function pageImages(doc, n, seen = new Set(), minSide = 16) {
  const page = await doc.getPage(n);
  const ops = await page.getOperatorList();
  const O = pdfjs.OPS;
  const refs = [];
  for (let i = 0; i < ops.fnArray.length; i++) {
    const fn = ops.fnArray[i];
    if (fn === O.paintImageXObject || fn === O.paintImageXObjectRepeat) refs.push({ id: ops.argsArray[i][0] });
    else if (fn === O.paintInlineImageXObject) refs.push({ inline: ops.argsArray[i][0] });
  }
  const images = [];
  const skipped = { small: 0, large: 0, failed: 0 };
  for (const r of refs) {
    let img = r.inline;
    if (r.id) {
      const key = r.id.startsWith("g_") ? r.id : `${n}:${r.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      img = await getObj(r.id.startsWith("g_") ? page.commonObjs : page.objs, r.id);
    }
    if (!img) { skipped.failed++; continue; } // 待っても届かなかった・中身がなかった
    if (Math.min(img.width, img.height) < minSide) { skipped.small++; continue; }
    const res = imageToCanvas(img);
    if (!res.canvas) { skipped[res.reason]++; continue; }
    try {
      const blob = await toBlob(res.canvas);
      images.push({ blob, width: res.canvas.width, height: res.canvas.height, opaque: res.opaque });
    } catch (e) {
      skipped.failed++;
    }
    res.canvas.width = res.canvas.height = 0;
  }
  page.cleanup();
  return { images, skipped };
}

/* PNG → JPEG（写真を軽くする）。透明な部分がない画像だけに使う */
export async function toJpeg(blob, quality = 0.9) {
  const bmp = await createImageBitmap(blob);
  const canvas = document.createElement("canvas");
  canvas.width = bmp.width;
  canvas.height = bmp.height;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bmp, 0, 0);
  bmp.close?.();
  const out = await new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("JPEGにできませんでした"))), "image/jpeg", quality));
  canvas.width = canvas.height = 0;
  return out;
}
