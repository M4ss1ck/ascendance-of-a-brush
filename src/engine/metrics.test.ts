import { describe, expect, it } from "vitest";
import { analyze } from "./analysis.ts";
import { fnv1a } from "../testing/fnv1a.ts";
import { boxBlur } from "./blur.ts";
import { metricMasks, score } from "./metrics.ts";

const W = 32,
  H = 32,
  N = W * H;

/** Light background, a dark filled square and a 1px dark line. */
const fixture = (): Uint8ClampedArray => {
  const px = new Uint8ClampedArray(N * 4);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let c: [number, number, number] = [236, 234, 228];
      if (x >= 9 && x <= 20 && y >= 9 && y <= 20) c = [38, 36, 44];
      if (y === 27 && x >= 4 && x <= 27) c = [20, 20, 26];
      const i = (y * W + x) * 4;
      px[i] = c[0];
      px[i + 1] = c[1];
      px[i + 2] = c[2];
      px[i + 3] = 255;
    }
  }
  return px;
};

const uniform = (v: [number, number, number]): Uint8ClampedArray => {
  const px = new Uint8ClampedArray(N * 4);
  for (let i = 0; i < N; i++) {
    px[i * 4] = v[0];
    px[i * 4 + 1] = v[1];
    px[i * 4 + 2] = v[2];
    px[i * 4 + 3] = 255;
  }
  return px;
};

const settings = {
  layers: 4,
  maxR: 12,
  palette: 0,
  seed: 7,
  ground: "toned" as const,
};

const px = fixture();
const a = analyze(px, W, H, settings);
const flatGrey = uniform([128, 128, 128]);

const ones = (mask: Uint8Array) => mask.reduce((n, v) => n + v, 0);

describe("metricMasks", () => {
  it("marks edges and lines on the fixture", () => {
    const m = metricMasks(a);
    expect(ones(m.edge)).toBeGreaterThan(0);
    expect(ones(m.lineMask)).toBeGreaterThan(0);
    // top 15% by gradient magnitude, plus ties at the cut value
    expect(ones(m.edge)).toBeLessThanOrEqual(Math.ceil(N * 0.15));
  });
});

describe("score", () => {
  it("scores the source perfectly on edges and lines", () => {
    const m = metricMasks(a);
    const s = score(a, m, px);
    expect(s.edge).toBe(0);
    expect(s.line).toBe(0);
    // only the r=1 soft blur differs from the source, so `all` stays small
    expect(s.all).toBeLessThan(score(a, m, flatGrey).all / 4);
  });

  it("scores flat grey worse than the source on every metric", () => {
    const m = metricMasks(a);
    const self = score(a, m, px),
      flat = score(a, m, flatGrey);
    expect(flat.all).toBeGreaterThan(self.all);
    expect(flat.edge).toBeGreaterThan(self.edge);
    expect(flat.line).toBeGreaterThan(self.line);
  });

  it("scores a blurred painting high on edge and line error", () => {
    const m = metricMasks(a);
    const g = boxBlur(a.src, W, H, 3, 2),
      blurred = new Uint8ClampedArray(N * 4);
    for (let i = 0; i < N; i++) {
      blurred[i * 4] = g[i * 3]!;
      blurred[i * 4 + 1] = g[i * 3 + 1]!;
      blurred[i * 4 + 2] = g[i * 3 + 2]!;
      blurred[i * 4 + 3] = 255;
    }
    const s = score(a, m, blurred);
    const self = score(a, m, px);
    expect(s.edge).toBeGreaterThan(self.edge);
    expect(s.line).toBeGreaterThan(self.line);
  });

  // Captured by running the prototype's mask code and `score` (docs/reference/
  // brush-bench.html lines 289-306 and 453-469) on this fixture, so they pin the port
  // against the approved implementation rather than against itself.
  it("matches the prototype on the fixture", () => {
    const m = metricMasks(a);
    expect(fnv1a(m.edge)).toBe("1c629aad");
    expect(fnv1a(m.lineMask)).toBe("839c3263");
    expect(score(a, m, px)).toEqual({ all: 29.523501832620717, edge: 0, line: 0 });
    expect(score(a, m, flatGrey)).toEqual({
      all: 152.7019994143205,
      edge: 166.806952606557,
      line: 174.43160988586874,
    });
  });
});
