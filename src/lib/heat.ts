/**
 * 归档页“写作日历”的分档规则。
 *
 * - 文章：绝对产量，固定阈值；跨年份用同一把尺。
 * - 日记：相对节奏，按年份内部的非零月份取分位数；空月份不参与，
 *   避免把 25/50/75 分位一起拉到 0。
 */

export type HeatTier = 0 | 1 | 2 | 3 | 4;

export interface HeatScale {
  q25: number;
  q50: number;
  q75: number;
  /** 该年非零月份计数完全相等（含只有 1 个有内容的月份）。 */
  flat: boolean;
}

/** 文章：0 / 1 / 2–3 / 4–5 / 6+。 */
export function articleTier(count: number): HeatTier {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count <= 3) return 2;
  if (count <= 5) return 3;
  return 4;
}

/** 升序数组的分位数，位置取 (n−1) × p 并线性插值。 */
function quantile(sorted: number[], p: number): number {
  const position = (sorted.length - 1) * p;
  const low = Math.floor(position);
  const high = Math.ceil(position);
  const weight = position - low;
  return (sorted[low] ?? 0) * (1 - weight) + (sorted[high] ?? 0) * weight;
}

/** 用某一年 12 个月的计数（含 0）生成该年的日记分档阈值；全年无内容返回 null。 */
export function diaryScale(counts: number[]): HeatScale | null {
  const values = counts.filter((count) => count > 0).sort((a, b) => a - b);
  if (values.length === 0) return null;

  return {
    q25: quantile(values, 0.25),
    q50: quantile(values, 0.5),
    q75: quantile(values, 0.75),
    flat: values[0] === values[values.length - 1],
  };
}

/**
 * 日记：≤ q25 / ≤ q50 / ≤ q75 / > q75 四档。
 * 计数全等时统一 tier 2，表示“活跃但无相对差异”，不出星标。
 */
export function diaryTier(count: number, scale: HeatScale | null): HeatTier {
  if (count <= 0) return 0;
  if (!scale || scale.flat) return 2;
  if (count <= scale.q25) return 1;
  if (count <= scale.q50) return 2;
  if (count <= scale.q75) return 3;
  return 4;
}

/** 按年份内的相对节奏给出 12 个月的分档，供单测与调用方复用。 */
export function diaryTiers(counts: number[]): HeatTier[] {
  const scale = diaryScale(counts);
  return counts.map((count) => diaryTier(count, scale));
}
