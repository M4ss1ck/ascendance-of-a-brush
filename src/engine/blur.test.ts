import { describe, expect, it } from "vitest";
import { boxBlur, radiusForSigma } from "./blur.ts";
import { rngFrom } from "./prng.ts";

const mean = (data: Float32Array) => data.reduce((sum, v) => sum + v, 0) / data.length;

/**
 * Horizontally symmetric image: one row built from the first half then mirrored, repeated
 * down the image so only the horizontal pass and its clamped edge can shift brightness.
 */
const symmetricImage = (W: number, H: number, seed: number): Float32Array => {
  const rng = rngFrom(seed, 99);
  const half = Math.ceil(W / 2);
  const out = new Float32Array(W * H);
  const row = new Float32Array(W);
  for (let x = 0; x < half; x++) {
    const v = rng() * 255;
    row[x] = v;
    row[W - 1 - x] = v;
  }
  for (let y = 0; y < H; y++) out.set(row, y * W);
  return out;
};

describe("radiusForSigma", () => {
  // Reference values from docs/reference/brush-bench.html (line 222).
  const vectors: Array<[sigma: number, radius: number]> = [
    [0, 0],
    [0.5, 0],
    [0.8, 0],
    [1, 1],
    [1.5, 1],
    [2.5, 2],
    [3, 3],
    [6, 6],
    [9, 9],
  ];

  it.each(vectors)("radiusForSigma(%f) is %i", (sigma, radius) => {
    expect(radiusForSigma(sigma)).toBe(radius);
  });

  // ADR-0004: three passes of radius r give sigma = sqrt(r(r+1)), so the radius is the
  // inverse of that curve, never round(sigma) (round(R/2) was the prototype bug).
  it("uses the sqrt(r(r+1)) inverse, not round(sigma)", () => {
    expect(radiusForSigma(1.5)).toBe(1);
    expect(radiusForSigma(1.5)).not.toBe(Math.round(1.5));
  });

  it("keeps sqrt(r(r+1)) within 0.75 of sigma for sigma in [1, 12]", () => {
    for (let sigma = 1; sigma <= 12; sigma += 0.5) {
      const r = radiusForSigma(sigma);
      expect(Math.abs(Math.sqrt(r * (r + 1)) - sigma)).toBeLessThan(0.75);
    }
  });
});

describe("boxBlur", () => {
  it("returns an equal copy when r < 1", () => {
    const src = new Float32Array([1, 2, 3, 4, 5, 6]);
    const out = boxBlur(src, 3, 1, 2, 0);
    expect(out).not.toBe(src);
    expect(Array.from(out)).toEqual(Array.from(src));
  });

  it("keeps a constant image exactly constant (edge clamping)", () => {
    const W = 6,
      H = 4;
    const src = new Float32Array(W * H).fill(42);
    const out = boxBlur(src, W, H, 1, 2);
    for (const v of out) expect(v).toBe(42);
  });

  it("preserves the mean of a horizontally symmetric image", () => {
    const W = 512,
      H = 12;
    const src = symmetricImage(W, H, 7);
    const out = boxBlur(src, W, H, 1, 2);
    const before = mean(src);
    expect(Math.abs(mean(out) - before) / before).toBeLessThan(1e-3);
  });

  it("replicates the border on a step image and stays monotonic", () => {
    const W = 8,
      H = 1;
    const src = new Float32Array([0, 0, 0, 0, 100, 100, 100, 100]);
    const out = boxBlur(src, W, H, 1, 1);
    expect(out[0]).toBe(0);
    expect(out[W - 1]).toBe(100);
    for (let x = 1; x < W; x++) expect(out[x]! - out[x - 1]!).toBeGreaterThan(-1e-6);
  });

  it("blurs each channel independently", () => {
    const W = 5,
      H = 5,
      C = 3;
    const src = new Float32Array(W * H * C);
    for (let i = 0; i < W * H; i++) {
      src[i * C] = (i * 37) % 256;
      src[i * C + 1] = 50;
      src[i * C + 2] = 255 - ((i * 53) % 256);
    }
    const out = boxBlur(src, W, H, C, 1);
    for (let i = 0; i < W * H; i++) expect(out[i * C + 1]).toBeCloseTo(50, 5);
    // Channels 0 and 2 are not constant, so they must have changed.
    const channel = (data: Float32Array, c: number) =>
      Array.from(data.filter((_, i) => i % C === c));
    expect(channel(out, 0)).not.toEqual(channel(src, 0));
    expect(channel(out, 2)).not.toEqual(channel(src, 2));
  });
});
