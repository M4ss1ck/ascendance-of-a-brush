/**
 * Quality metrics ported verbatim from docs/reference/brush-bench.html.
 *
 * `metricMasks` covers the metric-only masks of `analyze` (lines 295-306): the difference
 * of Gaussians that flags thin lines (`lineMask`) and the top-15%-by-gradient-magnitude
 * `edge` mask. `analysis.ts` deliberately leaves these out.
 *
 * `score` covers the three scores of `score` (lines 453-469) minus the error-map overlay:
 * mean RGB Euclidean distance against the soft source overall, and against the sharp
 * source on the edge and line masks. Lower is better; see ADR-0008.
 *
 * Loop order and float arithmetic are frozen to the prototype; do not "fix" them.
 */

import type { Analysis } from "./analysis.ts";
import { boxBlur, radiusForSigma } from "./blur.ts";
import { clamp } from "./color.ts";

/** Ported from `LINE_METRIC_T` (line 273). */
const LINE_METRIC_T = 12;

/** Ported from the `lum` helper (line 290). */
const lum = (img: Float32Array, i: number) =>
  0.299 * img[i * 3]! + 0.587 * img[i * 3 + 1]! + 0.114 * img[i * 3 + 2]!;

/**
 * Builds the metric-only masks, ported from `analyze` (lines 295-306).
 *
 * `lineMask` comes from a difference of Gaussians on the sharp luminance: thin lines and
 * small spots respond, broad gradients don't. `edge` marks the top 15% of pixels by
 * gradient magnitude of `a.L`, the r=1 blurred luminance.
 */
export function metricMasks(a: Analysis): { edge: Uint8Array; lineMask: Uint8Array } {
  const { W, H, L } = a,
    N = W * H;

  const L0 = new Float32Array(N);
  for (let i = 0; i < N; i++) L0[i] = lum(a.src, i);

  // difference of Gaussians: thin lines and small spots respond, broad gradients don't
  const g1 = boxBlur(L0, W, H, 1, radiusForSigma(0.8)),
    g2 = boxBlur(L0, W, H, 1, radiusForSigma(2.5));
  const lineMask = new Uint8Array(N);
  for (let i = 0; i < N; i++) lineMask[i] = Math.abs(g1[i]! - g2[i]!) > LINE_METRIC_T ? 1 : 0;

  // "edge pixels" for the edge metric: top 15% by gradient magnitude
  const at = (x: number, y: number) => L[clamp(y, 0, H - 1) * W + clamp(x, 0, W - 1)]!;
  const gmag = new Float32Array(N);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++)
      gmag[y * W + x] = Math.hypot(at(x + 1, y) - at(x - 1, y), at(x, y + 1) - at(x, y - 1));
  const cut = Float32Array.from(gmag).toSorted()[Math.floor(N * 0.85)]!;
  const edge = new Uint8Array(N);
  for (let i = 0; i < N; i++) edge[i] = gmag[i]! > cut ? 1 : 0;

  return { edge, lineMask };
}

/**
 * Scores an RGBA painting against an analysis, ported from `score` (lines 453-469).
 *
 * All three are mean RGB Euclidean distances, lower is better. `all` compares with the
 * soft source so brush texture isn't punished; `edge` and `line` compare with the sharp
 * source, because a blurred reference would punish keeping edges sharp (ADR-0008).
 */
export function score(
  a: Analysis,
  m: { edge: Uint8Array; lineMask: Uint8Array },
  data: Uint8ClampedArray,
): { all: number; edge: number; line: number } {
  const N = a.W * a.H,
    soft = a.soft,
    src = a.src;
  let all = 0,
    edge = 0,
    ne = 0,
    line = 0,
    nl = 0;
  for (let i = 0; i < N; i++) {
    const e = Math.hypot(
      soft[i * 3]! - data[i * 4]!,
      soft[i * 3 + 1]! - data[i * 4 + 1]!,
      soft[i * 3 + 2]! - data[i * 4 + 2]!,
    );
    all += e;
    // edges and lines are scored against the sharp source: a blurred reference would punish keeping them sharp
    const es =
      m.edge[i] || m.lineMask[i]
        ? Math.hypot(
            src[i * 3]! - data[i * 4]!,
            src[i * 3 + 1]! - data[i * 4 + 1]!,
            src[i * 3 + 2]! - data[i * 4 + 2]!,
          )
        : 0;
    if (m.edge[i]) {
      edge += es;
      ne++;
    }
    if (m.lineMask[i]) {
      line += es;
      nl++;
    }
  }
  return { all: all / N, edge: edge / Math.max(1, ne), line: line / Math.max(1, nl) };
}
