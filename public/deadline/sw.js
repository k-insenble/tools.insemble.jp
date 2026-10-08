/* あと何日？ — オフラインで開けるようにするための Service Worker（範囲は /deadline/ だけ）
   ・ページ：ネットを先に見て、つながらなければ保存しておいたものを出す
   ・/_astro/ のファイル（名前にハッシュ付き＝中身が変わらない）とアイコン：保存しておいたものを先に使う
   ・文字（Google Fonts）：保存しておいたものを出しつつ、裏で新しくする
   入力した締切などのデータは localStorage にあり、ここでは扱わない。計測タグ（GA・Clarity）にも触らない */
const CACHE = "atonannichi-v2";
const PAGE = "/deadline/";
const FIXED = ["/deadline/manifest.webmanifest", "/deadline/icon-192.png", "/deadline/icon-512.png", "/deadline/icon-maskable-512.png", "/deadline/apple-touch-icon.png"];
const FONT_HOSTS = ["fonts.googleapis.com", "fonts.gstatic.com"];

/* ページの HTML から、使っている /_astro/ のファイルを集める（JS が読み込む別の JS も、たどって集める） */
async function assetsOf(html) {
  const found = new Set();
  const queue = [...html.matchAll(/(?:href|src)="(\/_astro\/[^"?#]+)"/g)].map((m) => m[1]);
  while (queue.length && found.size < 80) {
    const u = queue.shift();
    if (found.has(u)) continue;
    found.add(u);
    if (!u.endsWith(".js")) continue;
    try {
      const js = await (await fetch(u)).text();
      for (const m of js.matchAll(/["'](\.{1,2}\/[^"']+?\.(?:js|css))["']|["'](\/_astro\/[^"']+?\.(?:js|css))["']/g)) {
        queue.push(new URL(m[1] || m[2], self.location.origin + u).pathname);
      }
    } catch (e) {}
  }
  return [...found];
}

/* ページを保存し直して、いま使っていない古い /_astro/ のファイルを消す */
async function refresh(res) {
  const c = await caches.open(CACHE);
  const html = await res.clone().text();
  await c.put(PAGE, res);
  const want = await assetsOf(html);
  await Promise.all([...want, ...FIXED].map(async (u) => { if (!(await c.match(u, { ignoreVary: true }))) await c.add(u).catch(() => {}); }));
  const keep = new Set(want);
  for (const req of await c.keys()) {
    const p = new URL(req.url).pathname;
    if (p.startsWith("/_astro/") && !keep.has(p)) await c.delete(req);
  }
}

self.addEventListener("install", (e) => {
  e.waitUntil((async () => {
    const res = await fetch(PAGE, { cache: "no-cache" });
    if (res.ok) await refresh(res);
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith("atonannichi-") && k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const same = url.origin === self.location.origin;

  if (req.mode === "navigate" && same && url.pathname.startsWith(PAGE)) {
    e.respondWith((async () => {
      try {
        const res = await fetch(req);
        if (res.ok && url.pathname === PAGE) e.waitUntil(refresh(res.clone()));
        return res;
      } catch (err) {
        return (await caches.match(PAGE, { ignoreVary: true })) || new Response("オフラインです。ネットにつながってから、もう一度開いてください。", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
      }
    })());
    return;
  }

  if (same && (url.pathname.startsWith("/_astro/") || FIXED.includes(url.pathname))) {
    e.respondWith((async () => {
      const hit = await caches.match(req, { ignoreSearch: true, ignoreVary: true }); // JS は CORS で読まれるので Vary を見ない（名前にハッシュ付き）
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) { const c = await caches.open(CACHE); c.put(req, res.clone()); }
      return res;
    })());
    return;
  }

  if (FONT_HOSTS.includes(url.hostname)) {
    e.respondWith((async () => {
      const c = await caches.open(CACHE);
      const hit = await c.match(req, { ignoreVary: true });
      const net = fetch(req).then((res) => { if (res.ok || res.type === "opaque") c.put(req, res.clone()); return res; }).catch(() => hit);
      return hit || net;
    })());
  }
});
