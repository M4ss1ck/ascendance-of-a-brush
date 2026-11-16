/**
 * Box blur and radius helpers ported verbatim from docs/reference/brush-bench.html.
 *
 * Loop order and float32 arithmetic are frozen to the prototype; do not "fix" them.
 */

import { clamp } from "./color.ts";

/**
 * Three box passes of radius r approximate a Gaussian with sigma = sqrt(r(r+1)).
 *
 * Ported from `boxBlur` (lines 192-221).
 */
export function boxBlur(
  src: Float32Array,
  W: number,
  H: number,
  C: number,
  r: number,
): Float32Array {
  if (r < 1) return src.slice();
  let a = src.slice(),
    b = new Float32Array(src.length);
  const norm = 1 / (2 * r + 1);
  for (let pass = 0; pass < 3; pass++) {
    for (let y = 0; y < H; y++) {
      const row = y * W;
      for (let c = 0; c < C; c++) {
        let s = 0;
        for (let k = -r; k <= r; k++) s += a[(row + clamp(k, 0, W - 1)) * C + c]!;
        for (let x = 0; x < W; x++) {
          b[(row + x) * C + c] = s * norm;
          s +=
            a[(row + Math.min(W - 1, x + r + 1)) * C + c]! - a[(row + Math.max(0, x - r)) * C + c]!;
        }
      }
    }
    for (let x = 0; x < W; x++) {
      for (let c = 0; c < C; c++) {
        let s = 0;
        for (let k = -r; k <= r; k++) s += b[(clamp(k, 0, H - 1) * W + x) * C + c]!;
        for (let y = 0; y < H; y++) {
          a[(y * W + x) * C + c] = s * norm;
          s +=
            b[(Math.min(H - 1, y + r + 1) * W + x) * C + c]! -
            b[(Math.max(0, y - r) * W + x) * C + c]!;
        }
      }
    }
  }
  return a;
}

/** Ported from `radiusForSigma` (line 222). */
export const radiusForSigma: (sigma: number) => number = (sigma) =>
  Math.max(0, Math.round((Math.sqrt(1 + 4 * sigma * sigma) - 1) / 2));
