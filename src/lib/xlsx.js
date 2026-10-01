/* ===========================================================
   Excel（.xlsx）を作る（外部ライブラリなし）
   シートの形（sheet model）を受け取って、Excelで開ける .xlsx の Blob を返す。
   見た目（罫線・見出しの色・日付や時刻の書式）は STYLE の名前で指定する。
   どんな表にするかは src/lib/schedule-templates.js などの「テンプレート」側で決める。

   sheet model:
   {
     name: "予定",                      シート名（31文字まで）
     cols: [{ width: 14 }, ...],         列の幅（文字数）
     rows: [{ height?, cells: [cell | null, ...] }],
     merges?: ["A1:F1"],                 セルの結合
     freeze?: 2,                         この行までを固定（スクロールしても見える）
     filter?: "A2:F2",                   オートフィルタを付ける見出しの範囲
     printTitles?: 2,                    印刷のとき、毎ページくり返す行
     landscape?: true,
     title?: "ファイルのタイトル",
   }
   cell: { v: 値, t?: "s" | "n" | "date" | "time" | "f", s?: STYLE の名前, f?: 数式 }
   =========================================================== */
import { makeZip } from "./zip.js";

const MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/* 名前 → cellXfs の番号（styles.xml の並びと合わせる） */
export const STYLE = { base: 0, title: 1, head: 2, cell: 3, wrap: 4, date: 5, time: 6, band: 7, center: 8, note: 9, minutes: 10, bandDate: 11 };

const FONT = '<name val="游ゴシック"/><family val="3"/><charset val="128"/>';
const LINE = '<color rgb="FFB8BFC6"/>';
const STYLES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="4">
<numFmt numFmtId="164" formatCode="yyyy/m/d(aaa)"/>
<numFmt numFmtId="165" formatCode="h:mm"/>
<numFmt numFmtId="166" formatCode="0&quot;分&quot;"/>
<numFmt numFmtId="167" formatCode="yyyy&quot;年&quot;m&quot;月&quot;d&quot;日&quot;(aaa)"/>
</numFmts>
<fonts count="4">
<font><sz val="11"/>${FONT}</font>
<font><b/><sz val="14"/>${FONT}</font>
<font><b/><sz val="11"/>${FONT}</font>
<font><sz val="9"/><color rgb="FF6B7280"/>${FONT}</font>
</fonts>
<fills count="4">
<fill><patternFill patternType="none"/></fill>
<fill><patternFill patternType="gray125"/></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFEEF1F3"/><bgColor indexed="64"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFE4F1F2"/><bgColor indexed="64"/></patternFill></fill>
</fills>
<borders count="2">
<border><left/><right/><top/><bottom/><diagonal/></border>
<border><left style="thin">${LINE}</left><right style="thin">${LINE}</right><top style="thin">${LINE}</top><bottom style="thin">${LINE}</bottom><diagonal/></border>
</borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="12">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment vertical="center"/></xf>
<xf numFmtId="0" fontId="2" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>
<xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="165" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="0" fontId="2" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment vertical="center"/></xf>
<xf numFmtId="166" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="167" fontId="2" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>
</cellXfs>
<cellStyles count="1"><cellStyle name="標準" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

// XMLに入れられない制御文字は落とす（貼り付けた文字に混ざっていても壊れないように）
const x = (s) => String(s ?? "")
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g, "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function colName(i) {
  let s = "";
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
}

/* "2026-10-01" → Excel の日付（1900年方式のシリアル値）。読めなければ null */
export function dateSerial(str) {
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(String(str || "").trim());
  if (!m) return null;
  const t = Date.UTC(+m[1], +m[2] - 1, +m[3]);
  const d = new Date(t);
  if (d.getUTCMonth() !== +m[2] - 1) return null;
  return (t - Date.UTC(1899, 11, 30)) / 86400000;
}
/* "9:30" → 1日を1とした割合。読めなければ null */
export function timeSerial(str) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(str || "").trim());
  if (!m || +m[1] > 23 || +m[2] > 59) return null;
  return (+m[1] * 60 + +m[2]) / 1440;
}

/* Excel ではシート名に使えない文字がある */
export const safeSheetName = (s) => (String(s || "").replace(/[\[\]:*?/\\]/g, " ").trim() || "Sheet1").slice(0, 31);

function cellXml(c, ref) {
  const s = STYLE[c.s ?? "cell"] ?? 0;
  const empty = c.v === null || c.v === undefined || c.v === "";
  if (c.t === "f") return `<c r="${ref}" s="${s}"><f>${x(c.f)}</f>${empty ? "" : `<v>${x(c.v)}</v>`}</c>`;
  if (empty) return `<c r="${ref}" s="${s}"/>`;
  if (c.t === "n" || c.t === "date" || c.t === "time") {
    const n = Number(c.v);
    return Number.isFinite(n) ? `<c r="${ref}" s="${s}"><v>${n}</v></c>` : `<c r="${ref}" s="${s}"/>`;
  }
  return `<c r="${ref}" s="${s}" t="inlineStr"><is><t xml:space="preserve">${x(c.v)}</t></is></c>`;
}

function sheetXml(m) {
  const nCols = Math.max(1, m.cols.length);
  const last = `${colName(nCols - 1)}${Math.max(1, m.rows.length)}`;
  const pane = m.freeze
    ? `<pane ySplit="${m.freeze}" topLeftCell="A${m.freeze + 1}" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A${m.freeze + 1}" sqref="A${m.freeze + 1}"/>`
    : "";
  const cols = m.cols.map((c, i) => `<col min="${i + 1}" max="${i + 1}" width="${c.width || 12}" customWidth="1"/>`).join("");
  const rows = m.rows.map((r, ri) => {
    const cells = (r.cells || []).map((c, ci) => (c ? cellXml(c, colName(ci) + (ri + 1)) : "")).join("");
    const ht = r.height ? ` ht="${r.height}" customHeight="1"` : "";
    return `<row r="${ri + 1}"${ht}>${cells}</row>`;
  }).join("");
  const merges = m.merges?.length ? `<mergeCells count="${m.merges.length}">${m.merges.map((r) => `<mergeCell ref="${r}"/>`).join("")}</mergeCells>` : "";
  const filter = m.filter ? `<autoFilter ref="${m.filter}"/>` : "";
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>
<dimension ref="A1:${last}"/>
<sheetViews><sheetView tabSelected="1" workbookViewId="0">${pane}</sheetView></sheetViews>
<sheetFormatPr defaultRowHeight="18.75"/>
<cols>${cols}</cols>
<sheetData>${rows}</sheetData>
${filter}${merges}
<pageMargins left="0.5" right="0.5" top="0.6" bottom="0.6" header="0.3" footer="0.3"/>
<pageSetup paperSize="9" orientation="${m.landscape ? "landscape" : "portrait"}" fitToWidth="1" fitToHeight="0"/>
<headerFooter><oddFooter>&amp;C&amp;P / &amp;N</oddFooter></headerFooter>
</worksheet>`;
}

function workbookXml(m, name) {
  const q = `'${name.replace(/'/g, "''")}'`;
  const defs = [];
  if (m.filter) {
    const [a, b] = m.filter.split(":");
    const lastRow = m.rows.length;
    const abs = (ref, row) => "$" + ref.replace(/\d+$/, "") + "$" + row;
    defs.push(`<definedName name="_xlnm._FilterDatabase" localSheetId="0" hidden="1">${x(q)}!${abs(a, a.match(/\d+$/)[0])}:${abs(b, lastRow)}</definedName>`);
  }
  if (m.printTitles) defs.push(`<definedName name="_xlnm.Print_Titles" localSheetId="0">${x(q)}!$${m.printTitles}:$${m.printTitles}</definedName>`);
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<bookViews><workbookView/></bookViews>
<sheets><sheet name="${x(name)}" sheetId="1" r:id="rId1"/></sheets>
${defs.length ? `<definedNames>${defs.join("")}</definedNames>` : ""}
</workbook>`;
}

/** @returns {Promise<Blob>} */
export function buildXlsx(model) {
  const name = safeSheetName(model.name);
  const now = new Date().toISOString().replace(/\.\d+Z$/, "Z");
  const files = [
    { name: "[Content_Types].xml", data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>` },
    { name: "_rels/.rels", data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>` },
    { name: "docProps/core.xml", data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
<dc:title>${x(model.title || name)}</dc:title>
<dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created>
<dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified>
</cp:coreProperties>` },
    { name: "docProps/app.xml", data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>insemble tools</Application></Properties>` },
    { name: "xl/workbook.xml", data: workbookXml(model, name) },
    { name: "xl/_rels/workbook.xml.rels", data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>` },
    { name: "xl/styles.xml", data: STYLES_XML },
    { name: "xl/worksheets/sheet1.xml", data: sheetXml(model) },
  ];
  return makeZip(files, { mime: MIME });
}
