import { describe, expect, it } from "vitest";
import type { RGB } from "./color.ts";
import { kmeans, nearest } from "./palette.ts";
import { rngFrom } from "./prng.ts";

const W = 64,
  H = 64,
  N = W * H;

/** A 64x64 RGB image of pseudo-random colours. */
const build = (): Float32Array => {
  const r = rngFrom(1, 5),
    src = new Float32Array(N * 3);
  for (let i = 0; i < N * 3; i++) src[i] = r() * 255;
  return src;
};

describe("kmeans", () => {
  it("is deterministic for a given seed", () => {
    const src = build();
    expect(kmeans(src, N, 6, rngFrom(7, 777))).toEqual(kmeans(src, N, 6, rngFrom(7, 777)));
  });

  it("gives a different palette for a different seed", () => {
    const src = build();
    expect(kmeans(src, N, 6, rngFrom(7, 777))).not.toEqual(kmeans(src, N, 6, rngFrom(8, 777)));
  });

  it("returns exactly k centers of three finite numbers", () => {
    const cen = kmeans(build(), N, 6, rngFrom(7, 777));
    expect(cen).toHaveLength(6);
    for (const c of cen) {
      expect(c).toHaveLength(3);
      for (const v of c) expect(Number.isFinite(v)).toBe(true);
    }
  });

  it("finds the two colours of a two-colour image exactly", () => {
    const src = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      src[i * 3] = i % 2 ? 0 : 255;
      src[i * 3 + 1] = 0;
      src[i * 3 + 2] = i % 2 ? 255 : 0;
    }
    const keys = kmeans(src, N, 2, rngFrom(3, 4))
      .map((c) => c.join(","))
      .toSorted();
    expect(keys).toEqual(["0,0,255", "255,0,0"]);
  });
});

describe("nearest", () => {
  const pal: RGB[] = [
    [0, 0, 0],
    [10, 20, 30],
    [255, 255, 255],
  ];

  it("picks the closest entry by squared distance, by reference", () => {
    expect(nearest(pal, [12, 18, 32])).toBe(pal[1]);
    expect(nearest(pal, [250, 255, 250])).toBe(pal[2]);
    expect(nearest(pal, [-5, 0, 0])).toBe(pal[0]);
  });
});
