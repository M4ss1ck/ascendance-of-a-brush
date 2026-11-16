/**
 * Pure image analysis ported verbatim from docs/reference/brush-bench.html.
 *
 * Covers the parts of `analyze` (lines 283-315) that do not touch a canvas: the float32
 * RGB copy and mean, the per-layer radii and references (ADR-0004), the soft image and its
 * luminance, the coarse structure tensor steering stroke flow (ADR-0005), the k-means
 * palette and the grounds (ADR-0013).
 *
 * Resampling stays out: the prototype's carrier canvas, `drawImage` and `getImageData`
 * (lines 276-282) belong to the caller, which passes RGBA pixels in. `L0`, `lineMask` and
 * the gradient-magnitude `edge` mask are also out; they are metric-only.
 *
 * Loop order and float32 arithmetic are frozen to the prototype; do not "fix" them.
 */

import { boxBlur, radiusForSigma } from "./blur.ts";
import type { RGB } from "./color.ts";
import { kmeans } from "./palette.ts";
import { rngFrom } from "./prng.ts";
import { tensor } from "./tensor.ts";

export type Ground = "white" | "toned" | "blurred";

export interface AnalysisSettings {
  layers: number;
  maxR: number;
  palette: number;
  seed: number;
  ground: Ground;
}

export interface Analysis {
  W: number;
  H: number;
  src: Float32Array;
  soft: Float32Array;
  refs: Float32Array[];
  radii: number[];
  L: Float32Array;
  theta: Float32Array;
  strength: Float32Array;
  palette: RGB[] | null;
  ground: Uint8ClampedArray | null;
  toned: RGB;
}

/** Ported from the `lum` helper (line 290). */
const lum = (img: Float32Array, i: number) =>
  0.299 * img[i * 3]! + 0.587 * img[i * 3 + 1]! + 0.114 * img[i * 3 + 2]!;

/**
 * Analyses an RGBA image (`ImageData.data` layout) at W x H.
 *
 * Ported from `analyze` (lines 275-320), minus resampling and the metric-only masks.
 */
export function analyze(
  pixels: Uint8ClampedArray,
  W: number,
  H: number,
  s: AnalysisSettings,
): Analysis {
  const N = W * H,
    src = new Float32Array(N * 3);
  const mean = [0, 0, 0];
  for (let i = 0; i < N; i++)
    for (let k = 0; k < 3; k++) {
      src[i * 3 + k] = pixels[i * 4 + k]!;
      mean[k] = mean[k]! + pixels[i * 4 + k]! / N;
    }

  const radii: number[] = [];
  for (let i = 0; i < s.layers; i++) radii.push(Math.max(1.5, s.maxR / 2 ** i));
  const refs = radii.map((R) => boxBlur(src, W, H, 3, radiusForSigma(R * 0.5)));

  const soft = boxBlur(src, W, H, 3, 1);
  const L = new Float32Array(N);
  for (let i = 0; i < N; i++) L[i] = lum(soft, i);
  const coarse = tensor(L, W, H, 4); // stroke flow

  const palette = s.palette > 0 ? kmeans(src, N, s.palette, rngFrom(s.seed, 777)) : null;
  let ground: Uint8ClampedArray | null = null;
  if (s.ground === "blurred") {
    const g = boxBlur(src, W, H, 3, radiusForSigma(s.maxR * 0.75));
    ground = new Uint8ClampedArray(W * H * 4);
    for (let i = 0; i < N; i++) {
      ground[i * 4] = g[i * 3]!;
      ground[i * 4 + 1] = g[i * 3 + 1]!;
      ground[i * 4 + 2] = g[i * 3 + 2]!;
      ground[i * 4 + 3] = 255;
    }
  }
  const toned: RGB = [
    mean[0]! * 0.45 + 120 * 0.55,
    mean[1]! * 0.45 + 76 * 0.55,
    mean[2]! * 0.45 + 46 * 0.55,
  ];
  return {
    W,
    H,
    src,
    soft,
    refs,
    radii,
    L,
    theta: coarse.theta,
    strength: coarse.strength,
    palette,
    ground,
    toned,
  };
}
