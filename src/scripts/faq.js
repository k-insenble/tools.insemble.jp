/* ===========================================================
   よくある質問（src/components/Faq.astro）の開閉とカテゴリ
   1つ開くと、ほかは閉じる。カテゴリを変えたら先頭の1問を開く
   =========================================================== */
const list = document.querySelector("[data-faq]");
if (list) {
  const items = [...list.querySelectorAll(".q")];
  const setOpen = (q, open) => {
    q.classList.toggle("open", open);
    q.querySelector(".q-head").setAttribute("aria-expanded", open);
  };
  items.forEach((q) => q.querySelector(".q-head").addEventListener("click", () => {
    const open = !q.classList.contains("open");
    items.forEach((x) => setOpen(x, false));
    setOpen(q, open);
  }));
  const chips = [...document.querySelectorAll("[data-faq-cat]")];
  chips.forEach((b) => b.addEventListener("click", () => {
    const cat = b.dataset.faqCat;
    chips.forEach((x) => x.classList.toggle("on", x === b));
    items.forEach((q) => { q.hidden = !(cat === "すべて" || q.dataset.cat === cat); setOpen(q, false); });
    const first = items.find((q) => !q.hidden);
    if (first) setOpen(first, true);
  }));
}
