/* ===========================================================
   サイト共通の動き（React なしのページ用）
   - スクロールするとヘッダーに背景（.hdr.on）
   - ページ内リンク（#〜）は固定ヘッダーの高さぶん手前で止める
   =========================================================== */
const HEADER_OFFSET = 72;

export function goTo(hash) {
  const el = document.querySelector(hash);
  if (!el) return false;
  window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET, behavior: "smooth" });
  return true;
}

const hdr = document.querySelector(".hdr");
if (hdr) {
  const on = () => hdr.classList.toggle("on", window.scrollY > 8);
  on();
  window.addEventListener("scroll", on, { passive: true });
}

document.addEventListener("click", (e) => {
  const a = e.target.closest('a[href^="#"]');
  if (a && a.getAttribute("href").length > 1 && goTo(a.getAttribute("href"))) e.preventDefault();
});
