import { describe, expect, it } from "vitest";
import { fnv1a } from "../testing/fnv1a.ts";
import { analyze } from "./analysis.ts";
import type { BrushName } from "./brushes.ts";
import { paint, replay, type PaintSettings, type Plan } from "./paint.ts";
import { toMask, type Mask, type Selection } from "./selection.ts";

// Pins the masked planner (ADR-0009) against a real canvas: the ground is laid only inside
// the mask, strokes start inside it and may bleed out, a whole-image mask still gives the
// unmasked raster, and repainting or replaying the plan reproduces it.

const W = 40,
  H = 40;

/** Light background with a dark square, so the brushes have an edge to paint. */
const source = ((): Uint8ClampedArray => {
  const px = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      let c: [number, number, number] = [236, 234, 228];
      if (x >= 17 && x <= 22 && y >= 17 && y <= 22) c = [38, 36, 44];
      const i = (y * W + x) * 4;
      px[i] = c[0];
      px[i + 1] = c[1];
      px[i + 2] = c[2];
      px[i + 3] = 255;
    }
  return px;
})();

// Prototype defaults (paint.browser.test.ts), with maxR lowered from 24 to 6: the widest
// brush then bleeds well under the 12px between the mask and the canvas corners.
const settings: PaintSettings = {
  seed: 7,
  maxR: 6,
  layers: 4,
  threshold: 24,
  tol: 30,
  maxLen: 8,
  jitter: 0.6,
  colorJitter: 0.06,
  palette: 0,
  opacity: 0.9,
  ground: "toned",
};

/** A 16px square: 12px of clearance from the mask to the nearest canvas corner. */
const selection: Selection = { kind: "rect", x: 12, y: 12, w: 16, h: 16 };

/** Plans and paints on a fresh context, returning the plan and its raster. */
function run(mask: Mask | null, brush: BrushName): { plan: Plan; pixels: Uint8ClampedArray } {
  const a = analyze(source, W, H, settings);
  const ctx = new OffscreenCanvas(W, H).getContext("2d", { willReadFrequently: true })!;
  const plan = paint(ctx, a, settings, brush, mask);
  return { plan, pixels: ctx.getImageData(0, 0, W, H).data };
}

describe.each(["dab", "curve"] as const)("masked painting with %s", (brush) => {
  const mask = toMask(selection, W, H)!;

  it("matches the unmasked raster when the mask is the whole image", () => {
    const all = new Uint8Array(W * H).fill(1);

    expect(fnv1a(run(all, brush).pixels)).toBe(fnv1a(run(null, brush).pixels));
  });

  it.runIf(brush === "dab")("starts every dab inside the mask", () => {
    const { plan } = run(mask, brush);
    const dabs = plan.strokes.filter((s) => s.b === "dab");

    expect(dabs.length).toBeGreaterThan(0);
    for (const d of dabs) expect(mask[(d.y | 0) * W + (d.x | 0)]).toBe(1);
  });

  it("covers the mask and leaves the far corners transparent", () => {
    const { pixels } = run(mask, brush);

    const uncovered: number[] = [];
    for (let i = 0; i < W * H; i++) if (mask[i] && pixels[i * 4 + 3] !== 255) uncovered.push(i);
    expect(uncovered).toEqual([]);
    expect(pixels[3]).toBe(0); // (0, 0)
    expect(pixels[(W * H - 1) * 4 + 3]).toBe(0); // (39, 39)
  });

  it("repaints and replays to the same pixels", () => {
    const first = run(mask, brush);
    const again = run(mask, brush);
    const ctx = new OffscreenCanvas(W, H).getContext("2d", { willReadFrequently: true })!;
    replay(ctx, first.plan, W, H);

    const painted = fnv1a(first.pixels);
    expect(fnv1a(again.pixels)).toBe(painted);
    expect(fnv1a(ctx.getImageData(0, 0, W, H).data)).toBe(painted);
  });
});
