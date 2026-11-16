import { describe, expect, it } from "vitest";
import type { Analysis } from "./analysis.ts";
import type { RGB } from "./color.ts";
import {
  finishColor,
  makeCurve,
  makeDab,
  refColor,
  trace,
  type BrushSettings,
  type Point,
} from "./brushes.ts";
import { rngFrom } from "./prng.ts";

const W = 11,
  H = 11;

/** A flat, fully-steered analysis at W x H; override only what a test reads. */
const analysis = (over: Partial<Analysis> = {}): Analysis => ({
  W,
  H,
  src: new Float32Array(W * H * 3),
  soft: new Float32Array(W * H * 3),
  refs: [],
  radii: [],
  L: new Float32Array(W * H),
  theta: new Float32Array(W * H),
  strength: new Float32Array(W * H).fill(1),
  palette: null,
  ground: null,
  toned: [0, 0, 0],
  ...over,
});

const settings: BrushSettings = { tol: 30, maxLen: 40, colorJitter: 0.4, opacity: 0.8 };

const ref = ((): Float32Array => {
  const r = new Float32Array(W * H * 3);
  for (let i = 0; i < W * H; i++) {
    r[i * 3] = 100;
    r[i * 3 + 1] = 120;
    r[i * 3 + 2] = 140;
  }
  return r;
})();

const canv = new Uint8ClampedArray(W * H * 4);

describe("trace", () => {
  it("walks a horizontal line both ways from the centre, backward half first", () => {
    const a = analysis(); // theta and strength constant
    const pts = trace(5, 5, a.theta, 1, 20, () => true, a.W, a.H);

    expect(pts).toHaveLength(11);
    expect(pts[5]).toEqual([5, 5] satisfies Point); // start point in the middle
    expect(pts.map((p) => p[1])).toEqual(Array.from({ length: 11 }, () => 5));
    expect(pts.map((p) => p[0])).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });
});

describe("makeDab", () => {
  // Draw order: one draw for the radius, then the finishColor jitter draws.
  it("draws exactly the prototype's PRNG values", () => {
    const a = analysis();
    const seed = 1234;
    const dab = makeDab(4, 6, 8, ref, canv, rngFrom(seed), a, settings);

    const manual = rngFrom(seed);
    expect(dab.r).toBe(8 * (0.55 + 0.25 * manual()));
    expect(dab.c).toEqual(
      finishColor(refColor(ref, 4, 6, W), manual, a.palette, settings.colorJitter),
    );
    expect(dab.a).toBe(settings.opacity);
  });

  it("consumes no extra draws when snapping to a palette", () => {
    const pal: RGB[] = [
      [10, 20, 30],
      [200, 210, 220],
    ];
    const a = analysis({ palette: pal });
    const seed = 1234;
    const dab = makeDab(4, 6, 8, ref, canv, rngFrom(seed), a, settings);

    const manual = rngFrom(seed);
    expect(dab.r).toBe(8 * (0.55 + 0.25 * manual()));
    expect(dab.c).toEqual(finishColor(refColor(ref, 4, 6, W), manual, pal, settings.colorJitter));
  });
});

describe("makeCurve", () => {
  it("returns a lone point and a seed where strength is below 1", () => {
    const a = analysis({ strength: new Float32Array(W * H).fill(0.5) });
    const seed = 99;
    const curve = makeCurve(4, 6, 8, ref, canv, rngFrom(seed), a, settings);

    expect(curve.b).toBe("curve");
    expect(curve.pts).toEqual([[4, 6]]);
    expect(curve.w).toBe(8 * 1.4);

    // finishColor takes its jitter draws, then seedOf takes one more.
    const manual = rngFrom(seed);
    finishColor(refColor(ref, 4, 6, W), manual, a.palette, settings.colorJitter);
    expect(curve.seed).toBe((manual() * 4294967296) >>> 0);
  });

  // ADR-0009 rule 4: a transparent canvas pixel never stops the stroke. The start pixel's
  // own reference color differs from the rest, so an opaque canvas that matches the ref reads
  // as already painted and stops the trace; a transparent one is skipped instead.
  it("stops on an opaque canvas pixel that matches the ref, not on a transparent one", () => {
    const a = analysis();
    const start = (6 * W + 4) * 3;
    const base = ref.slice();
    base[start] = 30;
    base[start + 1] = 50;
    base[start + 2] = 70;
    const wide: BrushSettings = { ...settings, tol: 200 };
    const canvas = (alpha: number) => {
      const c = new Uint8ClampedArray(W * H * 4);
      for (let i = 0; i < W * H; i++) {
        c[i * 4] = ref[i * 3]!;
        c[i * 4 + 1] = ref[i * 3 + 1]!;
        c[i * 4 + 2] = ref[i * 3 + 2]!;
        c[i * 4 + 3] = alpha;
      }
      return c;
    };

    const opaque = makeCurve(4, 6, 8, base, canvas(255), rngFrom(1), a, wide);
    const clear = makeCurve(4, 6, 8, base, canvas(0), rngFrom(1), a, wide);

    expect(opaque.pts).toEqual([[4, 6]]);
    expect(clear.pts.length).toBeGreaterThan(1);
  });
});
