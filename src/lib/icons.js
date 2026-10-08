/* ===========================================================
   ラインアイコン（currentColor）
   Astro（Icon.astro）とブラウザ側の JS（結果パネル）で同じ定義を使う
   =========================================================== */
const P = {
  check: '<polyline points="4 12 9 17 20 6"/>',
  info: '<circle cx="12" cy="12" r="9"/><line x1="12" y1="11" x2="12" y2="16"/><circle cx="12" cy="7.5" r="0.6" fill="currentColor" stroke="none"/>',
  warn: '<path d="M12 3.5 22 20H2L12 3.5Z"/><line x1="12" y1="10" x2="12" y2="14.5"/><circle cx="12" cy="17.5" r="0.6" fill="currentColor" stroke="none"/>',
  x: '<line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/>',
  copy: '<rect x="9" y="9" width="11" height="11" rx="2.5"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/>',
  search: '<circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="21" y2="21"/>',
  link: '<path d="M10 14a4 4 0 0 0 6 .5l3-3a4 4 0 0 0-5.7-5.7L11.5 7"/><path d="M14 10a4 4 0 0 0-6-.5l-3 3a4 4 0 0 0 5.7 5.7L12.5 17"/>',
  chevron: '<polyline points="6 9 12 15 18 9"/>',
  arrow: '<line x1="4" y1="12" x2="19" y2="12"/><polyline points="13 6 19 12 13 18"/>',
  download: '<path d="M12 4v11"/><polyline points="7 11 12 16 17 11"/><path d="M5 20h14"/>',
  bolt: '<path d="M13 3 5 13h6l-1 8 8-10h-6l1-8Z"/>',
  tag: '<path d="M4 12.5V5a1 1 0 0 1 1-1h7.5L21 12.5 12.5 21 4 12.5Z"/><circle cx="8.5" cy="8.5" r="1.2" fill="currentColor" stroke="none"/>',
  book: '<path d="M4 5.5A2 2 0 0 1 6 4h6v15H6a2 2 0 0 0-2 1.5V5.5Z"/><path d="M20 5.5A2 2 0 0 0 18 4h-6v15h6a2 2 0 0 1 2 1.5V5.5Z"/>',
  sparkle: '<path d="M12 3c.6 4 1.6 5 5.5 6-3.9 1-4.9 2-5.5 6-.6-4-1.6-5-5.5-6 3.9-1 4.9-2 5.5-6Z"/>',
  eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="3"/>',
  code: '<polyline points="9 8 4 12 9 16"/><polyline points="15 8 20 12 15 16"/>',
  list: '<line x1="8" y1="7" x2="20" y2="7"/><line x1="8" y1="12" x2="20" y2="12"/><line x1="8" y1="17" x2="20" y2="17"/><circle cx="4" cy="7" r="0.8" fill="currentColor" stroke="none"/><circle cx="4" cy="12" r="0.8" fill="currentColor" stroke="none"/><circle cx="4" cy="17" r="0.8" fill="currentColor" stroke="none"/>',
  /* 追加したツール（PDF・席順・Excel・ルーレット・グループ分け）で使うもの */
  upload: '<path d="M12 16V5"/><polyline points="7 9 12 4 17 9"/><path d="M5 20h14"/>',
  file: '<path d="M14 3.5H7A1.5 1.5 0 0 0 5.5 5v14A1.5 1.5 0 0 0 7 20.5h10a1.5 1.5 0 0 0 1.5-1.5V8L14 3.5Z"/><polyline points="14 3.5 14 8 18.5 8"/>',
  text: '<line x1="5" y1="6" x2="19" y2="6"/><line x1="5" y1="10.5" x2="19" y2="10.5"/><line x1="5" y1="15" x2="19" y2="15"/><line x1="5" y1="19.5" x2="13" y2="19.5"/>',
  image: '<rect x="4" y="5" width="16" height="14" rx="2.5"/><circle cx="9" cy="10" r="1.6"/><path d="m5 17 4.2-4.2a1.6 1.6 0 0 1 2.2 0L19 19"/>',
  pages: '<rect x="7.5" y="3.5" width="12" height="15" rx="1.8"/><path d="M4.5 7v11.5A2 2 0 0 0 6.5 20.5h9"/>',
  zip: '<path d="M6 3.5h12v17H6z"/><path d="M11 3.5v2h2v2h-2v2h2v2h-2"/><rect x="10.5" y="13" width="3" height="3.5" rx=".8"/>',
  shuffle: '<polyline points="16 4 20 4 20 8"/><path d="M4 18 20 4"/><polyline points="20 16 20 20 16 20"/><path d="M14.5 14.5 20 20"/><path d="M4 5.5 9 10.5"/>',
  reset: '<path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3"/><polyline points="4.5 4 4.5 7.5 8 7.5"/>',
  trash: '<path d="M4.5 7h15"/><path d="M9.5 7V4.5h5V7"/><path d="M6.5 7l1 12.5h9l1-12.5"/>',
  plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  minus: '<line x1="5" y1="12" x2="19" y2="12"/>',
  up: '<polyline points="6 15 12 9 18 15"/>',
  down: '<polyline points="6 9 12 15 18 9"/>',
  dup: '<rect x="8.5" y="8.5" width="11" height="11" rx="2"/><path d="M15.5 8.5V6a1.5 1.5 0 0 0-1.5-1.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5"/>',
  sort: '<line x1="7" y1="5" x2="7" y2="19"/><polyline points="4 16 7 19 10 16"/><line x1="13" y1="7" x2="20" y2="7"/><line x1="13" y1="12" x2="18" y2="12"/><line x1="13" y1="17" x2="16" y2="17"/>',
  expand: '<polyline points="4 9 4 4 9 4"/><polyline points="15 4 20 4 20 9"/><polyline points="20 15 20 20 15 20"/><polyline points="9 20 4 20 4 15"/>',
  crown: '<path d="M4 8l4 4 4-7 4 7 4-4-1.5 10.5h-13L4 8Z"/>',
  users: '<circle cx="9" cy="8.5" r="3.2"/><path d="M3.5 19.5a5.5 5.5 0 0 1 11 0"/><circle cx="16.5" cy="9.5" r="2.5"/><path d="M16 14.2a4.6 4.6 0 0 1 4.8 4.6"/>',
};

/* ツール用（ハブの一覧・お気に入り。線は少し細め） */
const T = {
  timer: '<circle cx="12" cy="13.5" r="7.5"/><path d="M12 13.5V9.5"/><path d="M12 13.5l2.8 1.8"/><line x1="10" y1="3" x2="14" y2="3"/><line x1="12" y1="3" x2="12" y2="6"/>',
  share: '<circle cx="17" cy="6" r="2.6"/><circle cx="6.5" cy="12" r="2.6"/><circle cx="17" cy="18" r="2.6"/><line x1="9" y1="10.7" x2="14.6" y2="7.3"/><line x1="9" y1="13.3" x2="14.6" y2="16.7"/>',
  shield: '<path d="M12 3.5 19.5 6v6c0 4-3.2 7.2-7.5 8.5C7.7 19.2 4.5 16 4.5 12V6L12 3.5Z"/><polyline points="9 12 11.2 14.2 15.2 10.2"/>',
  tags: '<path d="M4 12.5V5a1 1 0 0 1 1-1h7.5L20 11.5 12.5 19 4 12.5Z"/><circle cx="8.3" cy="8.3" r="1.1" fill="currentColor" stroke="none"/>',
  link2: '<path d="M10 14a4 4 0 0 0 6 .5l3-3a4 4 0 0 0-5.7-5.7L11.5 7"/><path d="M14 10a4 4 0 0 0-6-.5l-3 3a4 4 0 0 0 5.7 5.7L12.5 17"/>',
  route: '<circle cx="6" cy="6.5" r="2.5"/><circle cx="18" cy="17.5" r="2.5"/><path d="M8.5 6.5h5a3 3 0 0 1 0 6h-3a3 3 0 0 0 0 6h4"/>',
  robot: '<rect x="4.5" y="8" width="15" height="11" rx="3"/><line x1="12" y1="4" x2="12" y2="8"/><circle cx="9.2" cy="13" r="1.1" fill="currentColor" stroke="none"/><circle cx="14.8" cy="13" r="1.1" fill="currentColor" stroke="none"/>',
  braces: '<path d="M9 4.5c-2 0-2.2 1.4-2.2 3.2S6.4 11 4.8 11c1.6 0 2 1.5 2 3.3s.2 3.2 2.2 3.2"/><path d="M15 4.5c2 0 2.2 1.4 2.2 3.2S17.6 11 19.2 11c-1.6 0-2 1.5-2 3.3s-.2 3.2-2.2 3.2"/>',
  list: '<line x1="8.5" y1="7" x2="20" y2="7"/><line x1="8.5" y1="12" x2="20" y2="12"/><line x1="8.5" y1="17" x2="20" y2="17"/><circle cx="4.5" cy="7" r="0.9" fill="currentColor" stroke="none"/><circle cx="4.5" cy="12" r="0.9" fill="currentColor" stroke="none"/><circle cx="4.5" cy="17" r="0.9" fill="currentColor" stroke="none"/>',
  crop: '<path d="M6.5 4v12.5A1.5 1.5 0 0 0 8 18h12"/><path d="M4 6.5h12.5A1.5 1.5 0 0 1 18 8v12"/>',
  send: '<path d="M20 4 3.5 11.2l6.4 2.1L12 20l8-16Z"/><line x1="9.9" y1="13.3" x2="20" y2="4"/>',
  qr: '<rect x="4" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5"/><path d="M14 14h2v2h-2zM18 18h2v2h-2z" fill="currentColor" stroke="none"/>',
  hash: '<line x1="9" y1="4" x2="7.5" y2="20"/><line x1="16.5" y1="4" x2="15" y2="20"/><line x1="4" y1="9.5" x2="20" y2="9.5"/><line x1="4" y1="15" x2="20" y2="15"/>',
  type: '<polyline points="5 7 5 4.5 19 4.5 19 7"/><line x1="12" y1="4.5" x2="12" y2="19.5"/><line x1="9" y1="19.5" x2="15" y2="19.5"/>',
  eraser: '<path d="M8.5 19.5 4 15l8.5-8.5 5.5 5.5-7 7.5H8.5Z"/><line x1="20" y1="19.5" x2="11.5" y2="19.5"/>',
  regex: '<line x1="6" y1="19" x2="6" y2="12"/><circle cx="17" cy="17.5" r="1.4" fill="currentColor" stroke="none"/><line x1="12" y1="5" x2="12" y2="12"/><line x1="8.8" y1="6.8" x2="15.2" y2="10.2"/><line x1="15.2" y1="6.8" x2="8.8" y2="10.2"/>',
  diff: '<line x1="6" y1="8" x2="14" y2="8"/><line x1="10" y1="4" x2="10" y2="12"/><line x1="6" y1="17" x2="14" y2="17"/><path d="M17.5 5.5 20 8l-2.5 2.5"/>',
  image: '<rect x="4" y="5" width="16" height="14" rx="2.5"/><circle cx="9" cy="10" r="1.6"/><path d="m5 17 4.2-4.2a1.6 1.6 0 0 1 2.2 0L19 19"/>',
  zip: '<path d="M6 4h12v4l-4 3 4 3v5a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-5l4-3-4-3V4Z"/>',
  swap: '<polyline points="7 7 4 10 7 13"/><path d="M4 10h9a4 4 0 0 1 0 8h-1"/><polyline points="17 17 20 14 17 11"/>',
  star: '<path d="M12 4l2.4 5.1 5.6.7-4.1 3.9 1 5.6-4.9-2.7-4.9 2.7 1-5.6L4 9.8l5.6-.7L12 4Z"/>',
  code: '<polyline points="9 8 4.5 12 9 16"/><polyline points="15 8 19.5 12 15 16"/>',
  key: '<circle cx="8" cy="12" r="3.5"/><path d="M11.5 12H20"/><line x1="16.5" y1="12" x2="16.5" y2="15.5"/><line x1="19" y1="12" x2="19" y2="14.5"/>',
  dice: '<rect x="4.5" y="4.5" width="15" height="15" rx="3.5"/><circle cx="9" cy="9" r="1.2" fill="currentColor" stroke="none"/><circle cx="15" cy="15" r="1.2" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none"/>',
  palette: '<path d="M12 20a8 8 0 1 1 8-8c0 2.2-1.8 3-3.4 3H15a2 2 0 0 0-1.4 3.4A1.8 1.8 0 0 1 12 20Z"/><circle cx="8.6" cy="10.4" r="1.1" fill="currentColor" stroke="none"/><circle cx="12" cy="7.8" r="1.1" fill="currentColor" stroke="none"/><circle cx="15.4" cy="9.6" r="1.1" fill="currentColor" stroke="none"/>',
  clock: '<circle cx="12" cy="12" r="8"/><polyline points="12 7.5 12 12 15.5 13.8"/>',
  pdf: '<path d="M14 3.5H7A1.5 1.5 0 0 0 5.5 5v14A1.5 1.5 0 0 0 7 20.5h10a1.5 1.5 0 0 0 1.5-1.5V8L14 3.5Z"/><polyline points="14 3.5 14 8 18.5 8"/><path d="M8.5 13.5h7M8.5 16.5h4.5"/>',
  seat: '<rect x="6.5" y="9" width="11" height="6" rx="1.6"/><circle cx="9" cy="5.5" r="1.4"/><circle cx="15" cy="5.5" r="1.4"/><circle cx="9" cy="18.5" r="1.4"/><circle cx="15" cy="18.5" r="1.4"/>',
  sheet: '<rect x="4" y="4.5" width="16" height="15" rx="2"/><line x1="4" y1="9.5" x2="20" y2="9.5"/><line x1="4" y1="14.5" x2="20" y2="14.5"/><line x1="10" y1="4.5" x2="10" y2="19.5"/>',
  wheel: '<circle cx="12" cy="12.5" r="8"/><line x1="12" y1="4.5" x2="12" y2="20.5"/><line x1="5.1" y1="8.5" x2="18.9" y2="16.5"/><line x1="5.1" y1="16.5" x2="18.9" y2="8.5"/><path d="M10.5 2.5h3L12 5Z" fill="currentColor"/>',
  users: '<circle cx="9" cy="8.5" r="3.2"/><path d="M3.5 19.5a5.5 5.5 0 0 1 11 0"/><circle cx="16.5" cy="9.5" r="2.5"/><path d="M16 14.2a4.6 4.6 0 0 1 4.8 4.6"/>',
};

const draw = (paths, size, stroke, style, cls) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;${style}"${cls ? ` class="${cls}"` : ""}>${paths}</svg>`;

/* 飾りとして使うので aria-hidden。意味を伝えたいときは隣にテキストを置く */
export function svg(name, size = 20, { stroke = 1.8, style = "", cls = "" } = {}) {
  return draw(P[name] || "", size, stroke, style, cls);
}
export function toolSvg(name, size = 19, { style = "", cls = "" } = {}) {
  return draw(T[name] || T.code, size, 1.7, style, cls);
}
