/* ===========================================================
   名前を入れて分けるツール（席順メーカー・グループ分けメーカー）の共通部分
   - 参加者の欄（1行1人）と人数の表示
   - 「いくつに分けるか」と「1つに何人か」を連動させる（どちらを動かしても、もう片方が合う）
   - 条件（同じにしない／同じにする）の読み取り
   =========================================================== */
import { $, stepper } from "./common.js";
import { parsePeople, parsePairs, splitSizes } from "../../lib/arrange.js";

/**
 * @param {{ names: HTMLTextAreaElement, count: HTMLElement, groups: HTMLElement, per: HTMLElement, summary: HTMLElement, unit: string, perUnit?: string, even?: () => boolean, leadMark?: boolean }} o
 */
export function peopleForm(o) {
  let last = "per"; // 最後に動かしたほう（名前が増減したとき、こちらを保つ）
  const read = () => parsePeople(o.names.value, { leadMark: !!o.leadMark }); // leadMark：★ をリーダーの印として読む（グループ分け）
  const groups = stepper(o.groups, () => { last = "groups"; sync(); });
  const per = stepper(o.per, () => { last = "per"; sync(); });

  function sizes(n) {
    const even = o.even ? o.even() : true;
    if (!even && last === "per") return splitSizes(n, Math.ceil(n / per.get()), { even: false, per: per.get() });
    return splitSizes(n, groups.get(), { even });
  }

  function sync() {
    const { people } = read();
    const n = people.length;
    o.count.textContent = `${n}人`;
    if (n > 0) {
      if (last === "per") groups.set(Math.max(1, Math.ceil(n / per.get())), false);
      else per.set(Math.max(1, Math.ceil(n / Math.min(groups.get(), n))), false);
      if (groups.get() > n) groups.set(n, false);
    }
    if (!n) { o.summary.textContent = "参加者を入れると、ここに分け方が出ます"; return; }
    const s = sizes(n);
    const uniq = [...new Set(s)].sort((a, b) => b - a);
    o.summary.textContent = `${n}人 → ${s.length}${o.unit}（${uniq.map((k) => `${k}人×${s.filter((x) => x === k).length}`).join("・")}）`;
  }

  o.names.addEventListener("input", sync);
  sync();

  return {
    read,
    sync,
    sizes: () => sizes(read().people.length),
    reset() { o.names.value = ""; last = "per"; sync(); },
  };
}

/* 条件の欄から rules をつくる。見つからない名前は注意に出す */
export function readRules(people, fields) {
  const rules = [];
  const warnings = [];
  for (const [type, el] of fields) {
    if (!el || !el.value.trim()) continue;
    const { pairs, unknown } = parsePairs(el.value, people);
    if (pairs.length) rules.push({ type, pairs });
    if (unknown.length) warnings.push(`参加者にいない名前は条件から外しました：${unknown.slice(0, 5).join("、")}${unknown.length > 5 ? " ほか" : ""}`);
  }
  return { rules, warnings };
}

export const hasTags = (people) => people.some((p) => p.tag);
export { $ };
