/**
 * Palette extraction ported verbatim from docs/reference/brush-bench.html.
 *
 * Sample count, PRNG draw order and float32 staging are frozen to the prototype; do not
 * "fix" them.
 */

import type { RGB } from "./color.ts";
import type { Rng } from "./prng.ts";

/**
 * k-means++ over a strided RGB sample of the image, then 10 Lloyd iterations.
 *
 * Draw order is load-bearing: S sample draws, one draw for the first center, then one
 * draw per additional center. Empty clusters keep their center.
 *
 * Ported from `kmeans` (lines 224-248).
 */
export function kmeans(src: Float32Array, n: number, k: number, rng: Rng): RGB[] {
  const S = Math.min(4000, n),
    pts = new Float32Array(S * 3);
  for (let i = 0; i < S; i++) {
    const j = (rng() * n) | 0;
    pts[i * 3] = src[j * 3]!;
    pts[i * 3 + 1] = src[j * 3 + 1]!;
    pts[i * 3 + 2] = src[j * 3 + 2]!;
  }
  const cen: RGB[] = [];
  const d2 = (i: number, c: RGB) =>
    (pts[i * 3]! - c[0]) ** 2 + (pts[i * 3 + 1]! - c[1]) ** 2 + (pts[i * 3 + 2]! - c[2]) ** 2;
  const f = (rng() * S) | 0;
  cen.push([pts[f * 3]!, pts[f * 3 + 1]!, pts[f * 3 + 2]!]);
  const dist = new Float32Array(S);
  while (cen.length < k) {
    // k-means++
    let tot = 0;
    for (let i = 0; i < S; i++) {
      let m = Infinity;
      for (const c of cen) m = Math.min(m, d2(i, c));
      dist[i] = m;
      tot += m;
    }
    let t = rng() * tot,
      i = 0;
    for (; i < S - 1; i++) {
      t -= dist[i]!;
      if (t <= 0) break;
    }
    cen.push([pts[i * 3]!, pts[i * 3 + 1]!, pts[i * 3 + 2]!]);
  }
  for (let it = 0; it < 10; it++) {
    const acc = cen.map((): [number, number, number, number] => [0, 0, 0, 0]);
    for (let i = 0; i < S; i++) {
      let best = 0,
        bd = Infinity;
      for (let c = 0; c < k; c++) {
        const d = d2(i, cen[c]!);
        if (d < bd) {
          bd = d;
          best = c;
        }
      }
      const a = acc[best]!;
      a[0] += pts[i * 3]!;
      a[1] += pts[i * 3 + 1]!;
      a[2] += pts[i * 3 + 2]!;
      a[3]++;
    }
    acc.forEach((a, c) => {
      if (a[3]) cen[c] = [a[0] / a[3], a[1] / a[3], a[2] / a[3]];
    });
  }
  return cen;
}

/**
 * Closest palette entry to `c` by squared RGB distance, returned by reference.
 *
 * Ported from `nearest` (lines 249-253).
 */
export function nearest(pal: RGB[], c: RGB): RGB {
  let best = pal[0]!,
    bd = Infinity;
  for (const p of pal) {
    const d = (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2 + (p[2] - c[2]) ** 2;
    if (d < bd) {
      bd = d;
      best = p;
    }
  }
  return best;
}
