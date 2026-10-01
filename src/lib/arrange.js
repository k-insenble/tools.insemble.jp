/* ===========================================================
   人を「卓」や「グループ」に振り分ける（席順メーカー・グループ分けメーカー・ルーレットで共通）
   - 乱数は crypto.getRandomValues（かたよりの少ない乱数）
   - 条件（rules）は「点数（cost）」で表し、入れ替えを繰り返して少ないほうへ寄せる
     → 条件を増やすときは COST に1つ関数を足すだけでよい
       いまあるもの：apart（同じにしない）／together（同じにする）／spread（属性を散らす）／lead（リーダーを1グループに1人ずつ）
       これから足せるもの：前回と同じ組を避ける、男女比 など
   =========================================================== */

/* 0 以上 n 未満の整数 */
export function randInt(n) {
  if (n <= 1) return 0;
  const buf = new Uint32Array(1);
  const limit = Math.floor(0x100000000 / n) * n; // 端数を捨てて、かたよりをなくす
  let v;
  do { crypto.getRandomValues(buf); v = buf[0]; } while (v >= limit);
  return v % n;
}
export function shuffle(list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const MAX_PEOPLE = 500;
export const MAX_NAME = 40;

/* 1行1人。空行は飛ばす。「名前,部署」「名前<TAB>部署」なら2つめを属性として読む
   leadMark: true なら、名前の前かうしろの ★ ☆ * ＊ を「リーダーの印」として読み、名前からは外す
   返り値の warnings は画面に出す注意（止めはしない） */
const LEAD_MARK = /^[★☆*＊]+\s*|\s*[★☆*＊]+$/g;
export function parsePeople(text, { leadMark = false } = {}) {
  const warnings = [];
  const people = [];
  const lines = String(text || "").split(/\r?\n/);
  for (const line of lines) {
    const raw = line.replace(/　/g, " ").trim();
    if (!raw) continue;
    let [name, tag] = raw.split(/\s*[,，\t]\s*/);
    let lead = false;
    if (leadMark && name) {
      const stripped = name.replace(LEAD_MARK, "");
      lead = stripped !== name;
      name = stripped.trim();
    }
    if (!name) continue;
    people.push({ name: name.slice(0, MAX_NAME), tag: (tag || "").slice(0, MAX_NAME), lead });
  }
  if (people.some((p) => p.name.length >= MAX_NAME)) warnings.push(`長い名前は${MAX_NAME}文字までにしています。`);
  if (people.length > MAX_PEOPLE) {
    warnings.push(`${MAX_PEOPLE}人までにしています（${people.length - MAX_PEOPLE}人を外しました）。`);
    people.length = MAX_PEOPLE;
  }
  const seen = new Map();
  for (const p of people) seen.set(p.name, (seen.get(p.name) || 0) + 1);
  const dup = [...seen].filter(([, n]) => n > 1).map(([k]) => k);
  if (dup.length) warnings.push(`同じ名前がいます（${dup.slice(0, 3).join("、")}${dup.length > 3 ? " ほか" : ""}）。別の人なら「田中A」のように書き分けると見分けやすくなります。`);
  return { people, warnings };
}

/* 「田中 佐藤」「田中、佐藤」→ 名前の組。見つからない名前は無視して、注意に出す */
export function parsePairs(text, people) {
  const names = new Map();
  people.forEach((p, i) => { if (!names.has(p.name)) names.set(p.name, []); names.get(p.name).push(i); });
  const pairs = [];
  const unknown = [];
  for (const line of String(text || "").split(/\r?\n/)) {
    // 「、」や「,」で区切ってあればそれで（フルネームの空白を残す）、なければ空白で区切る
    const line2 = line.replace(/　/g, " ").trim();
    let parts = line2.split(/\s*[,，、/／]\s*/).filter(Boolean);
    if (parts.length < 2) parts = line2.split(/\s+/).filter(Boolean);
    if (parts.length < 2) continue;
    const idx = parts.map((n) => { if (!names.has(n)) unknown.push(n); return names.get(n) || []; });
    // 1行に3人以上書いたら、全員どうしを組にする
    for (let a = 0; a < idx.length; a++) for (let b = a + 1; b < idx.length; b++)
      for (const i of idx[a]) for (const j of idx[b]) if (i !== j) pairs.push([i, j]);
  }
  return { pairs, unknown: [...new Set(unknown)] };
}

/* n 人を k 個に分けるときの、それぞれの人数
   even=true：差が1人以内になるようにならす／false：per 人ずつ区切って、余りは最後へ */
export function splitSizes(n, k, { even = true, per = 0 } = {}) {
  k = Math.max(1, Math.min(k, n || 1));
  if (!even && per > 0) {
    const sizes = [];
    for (let left = n; left > 0; left -= per) sizes.push(Math.min(per, left));
    return sizes.length ? sizes : [0];
  }
  const base = Math.floor(n / k), extra = n % k;
  return Array.from({ length: k }, (_, i) => base + (i < extra ? 1 : 0));
}

/* ---------- 条件の点数（少ないほど良い） ---------- */
const COST = {
  apart: (where, rule) => rule.pairs.reduce((s, [a, b]) => s + (where[a] === where[b] ? 10 : 0), 0),
  together: (where, rule) => rule.pairs.reduce((s, [a, b]) => s + (where[a] !== where[b] ? 10 : 0), 0),
  // リーダー（members）が、どのグループにも「全体の人数 ÷ グループ数」の切り下げ〜切り上げの範囲で入っているか
  lead: (where, rule, ctx) => {
    const G = ctx.sizes.length, L = rule.members.length;
    const lo = Math.floor(L / G), hi = Math.ceil(L / G);
    const counts = new Array(G).fill(0);
    for (const i of rule.members) counts[where[i]]++;
    return counts.reduce((s, c) => s + 10 * (Math.max(0, c - hi) + Math.max(0, lo - c)), 0);
  },
  // 属性（部署など）ごとに、各グループの人数が「平均」からどれだけずれているか
  spread: (where, rule, ctx) => {
    let s = 0;
    for (const [tag, members] of ctx.tags) {
      const counts = new Array(ctx.sizes.length).fill(0);
      for (const i of members) counts[where[i]]++;
      counts.forEach((c, g) => { const ideal = (members.length * ctx.sizes[g]) / ctx.n; s += (c - ideal) ** 2; });
    }
    return s;
  },
};

function totalCost(where, rules, ctx) {
  return rules.reduce((s, r) => s + (COST[r.type] ? COST[r.type](where, r, ctx) : 0), 0);
}

/**
 * @param {{ name: string, tag?: string }[]} people
 * @param {number[]} sizes 各グループの人数（合計は people.length）
 * @param {{ random?: boolean, rules?: { type: string, pairs?: number[][], members?: number[] }[] }} opts
 * @returns {{ groups: number[][], unmet: number }} groups は people の番号。unmet は守れなかった apart/together/lead の数
 */
export function arrange(people, sizes, { random = true, rules = [] } = {}) {
  const n = people.length;
  const active = rules.filter((r) => r.type === "spread" || r.pairs?.length || r.members?.length);
  const leadRule = active.find((r) => r.type === "lead");
  const tags = new Map();
  people.forEach((p, i) => { if (p.tag) { if (!tags.has(p.tag)) tags.set(p.tag, []); tags.get(p.tag).push(i); } });
  const ctx = { n, sizes, tags };

  const fill = (order) => {
    const where = new Array(n);
    let g = 0, left = sizes[0];
    for (const i of order) {
      while (left === 0 && g < sizes.length - 1) left = sizes[++g];
      where[i] = g;
      left--;
    }
    return where;
  };

  /* リーダーがいるときは、先にリーダーを1グループずつ順に配ってから、残りの人で埋める */
  const seed = (order) => {
    if (!leadRule) return fill(order);
    const G = sizes.length;
    const where = new Array(n);
    const left = [...sizes];
    const isLead = new Set(leadRule.members);
    const gOrder = random ? shuffle([...Array(G).keys()]) : [...Array(G).keys()];
    let k = 0;
    for (const i of order.filter((i) => isLead.has(i))) {
      for (let t = 0; t < G; t++) {
        const g = gOrder[(k + t) % G];
        if (left[g] > 0) { where[i] = g; left[g]--; k += t + 1; break; }
      }
    }
    let g = 0;
    for (const i of order.filter((i) => !isLead.has(i))) {
      while (left[g] === 0 && g < G - 1) g++;
      where[i] = g;
      left[g]--;
    }
    return where;
  };

  const base = [...Array(n).keys()];
  let best = seed(random ? shuffle(base) : base);
  let bestCost = active.length ? totalCost(best, active, ctx) : 0;

  // 条件があるときだけ、入れ替えて良くする（何回かやり直して、いちばん良いものを使う）
  if (active.length && n > 1 && sizes.length > 1) {
    const tries = random ? 6 : 1;
    const steps = Math.min(6000, 40 * n + 400);
    for (let t = 0; t < tries && bestCost > 0; t++) {
      const where = t === 0 ? [...best] : seed(shuffle(base));
      let cost = totalCost(where, active, ctx);
      for (let s = 0; s < steps && cost > 0; s++) {
        const a = randInt(n), b = randInt(n);
        if (where[a] === where[b]) continue;
        [where[a], where[b]] = [where[b], where[a]];
        const next = totalCost(where, active, ctx);
        if (next <= cost) cost = next;
        else [where[a], where[b]] = [where[b], where[a]];
      }
      if (cost < bestCost) { best = [...where]; bestCost = cost; }
    }
  }

  const groups = sizes.map(() => []);
  // グループの中の並び（＝席の順）は、ランダムなら混ぜ、そうでなければ入力順
  (random ? shuffle(base) : base).forEach((i) => groups[best[i]].push(i));
  const unmet = active.filter((r) => r.type !== "spread").reduce((s, r) => s + COST[r.type](best, r, ctx) / 10, 0);
  return { groups, unmet };
}
