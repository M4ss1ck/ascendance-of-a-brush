import { describe, expect, it } from "vitest";
import type { BrushName } from "../engine/brushes.ts";
import { fnv1a } from "../testing/fnv1a.ts";
import { drawSwatch } from "./swatch.ts";

// Pins the brush pick (ADR-0017): a rect filled edge to edge with that brush's own strokes,
// the same picture every time, and a different picture per brush.

const W = 72;
const H = 48;
const BRUSHES: BrushName[] = ["dab", "curve"];

function render(brush: BrushName): Uint8ClampedArray {
  const cv = document.createElement("canvas");
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext("2d", { willReadFrequently: true })!;
  drawSwatch(ctx, brush, W, H);
  return ctx.getImageData(0, 0, W, H).data;
}

describe("brush swatch", () => {
  it.each(BRUSHES)("draws the same %s pick twice", (brush) => {
    expect(fnv1a(render(brush))).toBe(fnv1a(render(brush)));
  });

  it("draws a different pick for each brush", () => {
    expect(fnv1a(render("dab"))).not.toBe(fnv1a(render("curve")));
  });

  it.each(BRUSHES)("fills the %s rect edge to edge", (brush) => {
    const px = render(brush);
    const alphaAt = (x: number, y: number): number => px[(y * W + x) * 4 + 3]!;

    // Every pixel carries paint: no transparent hole anywhere in the rect.
    for (let i = 3; i < px.length; i += 4) {
      if (px[i] === 0) throw new Error(`fully transparent pixel at index ${(i - 3) / 4}`);
    }

    // The strokes run off the rect, so the borders are painted too, not left bare.
    const edge = [
      [0, 0],
      [W - 1, 0],
      [0, H - 1],
      [W - 1, H - 1],
      [W >> 1, 0],
      [W >> 1, H - 1],
      [0, H >> 1],
      [W - 1, H >> 1],
    ] as const;
    for (const [x, y] of edge) expect(alphaAt(x, y)).toBeGreaterThanOrEqual(200);

    // A dense field of strokes, not a couple of lonely ones.
    let opaque = 0;
    for (let i = 3; i < px.length; i += 4) if (px[i] === 255) opaque++;
    expect(opaque / (W * H)).toBeGreaterThan(0.5);
  });
});
