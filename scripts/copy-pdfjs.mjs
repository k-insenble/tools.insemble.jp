/* PDFばらし屋（/pdf-extract/）が使う pdf.js の付属データを public/pdfjs/ にコピーする。
   npm run dev / build の前に自動で走る（package.json の predev / prebuild）。public/pdfjs/ は git に入れない。
   - cmaps          日本語など、フォントを埋め込んでいないPDFの文字を読むための対応表
   - standard_fonts 埋め込みのない欧文フォントで、ページを画像にするときに使う
   - wasm / iccs    JPEG2000・JBIG2 の画像と、色の変換（使うものだけ） */
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "node_modules", "pdfjs-dist");
const out = join(root, "public", "pdfjs");

if (!existsSync(src)) {
  console.error("[copy-pdfjs] node_modules/pdfjs-dist がありません。先に npm install を実行してください。");
  process.exit(1);
}
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
for (const dir of ["cmaps", "standard_fonts", "iccs"]) cpSync(join(src, dir), join(out, dir), { recursive: true });
// quickjs（PDF内のスクリプト実行用）は使わないので入れない
cpSync(join(src, "wasm"), join(out, "wasm"), { recursive: true, filter: (p) => !/quickjs/.test(p) });
console.log("[copy-pdfjs] public/pdfjs/ を用意しました");
