/**
 * Structure tensor ported verbatim from docs/reference/brush-bench.html.
 *
 * Loop order, Sobel weights and float32 arithmetic are frozen to the prototype; do not
 * "fix" them. See ADR-0005 (docs/adr/0005-stroke-direction-from-structure-tensor.md).
 */

import { boxBlur } from "./blur.ts";
import { clamp } from "./color.ts";

/**
 * Edge tangent and strength from the box-blurred structure tensor.
 *
 * Ported from `tensor` (lines 255-272); the caller passes r=4 for stroke flow.
 */
export function tensor(
  L: Float32Array,
  W: number,
  H: number,
  r: number,
): { theta: Float32Array; strength: Float32Array } {
  const at = (x: number, y: number) => L[clamp(y, 0, H - 1) * W + clamp(x, 0, W - 1)]!;
  const N = W * H;
  const T = new Float32Array(N * 3);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const gx =
        at(x + 1, y - 1) +
        2 * at(x + 1, y) +
        at(x + 1, y + 1) -
        at(x - 1, y - 1) -
        2 * at(x - 1, y) -
        at(x - 1, y + 1);
      const gy =
        at(x - 1, y + 1) +
        2 * at(x, y + 1) +
        at(x + 1, y + 1) -
        at(x - 1, y - 1) -
        2 * at(x, y - 1) -
        at(x + 1, y - 1);
      const i = (y * W + x) * 3;
      T[i] = gx * gx;
      T[i + 1] = gx * gy;
      T[i + 2] = gy * gy;
    }
  const Tb = boxBlur(T, W, H, 3, r),
    theta = new Float32Array(N),
    strength = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const a = Tb[i * 3]!,
      b = Tb[i * 3 + 1]!,
      dd = Tb[i * 3 + 2]!;
    const l1 = (a + dd) / 2 + Math.sqrt(((a - dd) / 2) ** 2 + b * b);
    theta[i] = 0.5 * Math.atan2(2 * b, a - dd) + Math.PI / 2; // edge tangent
    strength[i] = Math.sqrt(Math.max(0, l1));
  }
  return { theta, strength };
}
