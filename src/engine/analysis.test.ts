import { describe, expect, it } from "vitest";
import { analyze } from "./analysis.ts";

const W = 10,
  H = 10;

const uniform = (v: [number, number, number], w = W, h = H): Uint8ClampedArray => {
  const px = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    px[i * 4] = v[0];
    px[i * 4 + 1] = v[1];
    px[i * 4 + 2] = v[2];
    px[i * 4 + 3] = 255;
  }
  return px;
};

const settings = (over: Partial<Parameters<typeof analyze>[3]> = {}) => ({
  layers: 4,
  maxR: 12,
  palette: 0,
  seed: 7,
  ground: "toned" as const,
  ...over,
});

describe("analyze", () => {
  it("halves the radius per layer and floors it at 1.5", () => {
    const a = analyze(uniform([100, 100, 100]), W, H, settings({ layers: 5, maxR: 24 }));
    expect(a.radii).toEqual([24, 12, 6, 3, 1.5]);

    const b = analyze(uniform([100, 100, 100]), W, H, settings({ layers: 4, maxR: 6 }));
    expect(b.radii).toEqual([6, 3, 1.5, 1.5]);
  });

  it("returns one reference per layer", () => {
    for (const layers of [1, 3, 5]) {
      const a = analyze(uniform([100, 100, 100]), W, H, settings({ layers }));
      expect(a.refs.length).toBe(layers);
      for (const ref of a.refs) expect(ref.length).toBe(W * H * 3);
    }
  });

  it("extracts a palette only when the palette size is positive", () => {
    expect(analyze(uniform([100, 100, 100]), W, H, settings({ palette: 0 })).palette).toBeNull();
    expect(analyze(uniform([100, 100, 100]), W, H, settings({ palette: 6 })).palette).toHaveLength(
      6,
    );
  });

  it("builds a ground only for the blurred underpainting", () => {
    expect(
      analyze(uniform([100, 100, 100]), W, H, settings({ ground: "white" })).ground,
    ).toBeNull();
    expect(
      analyze(uniform([100, 100, 100]), W, H, settings({ ground: "toned" })).ground,
    ).toBeNull();

    const ground = analyze(uniform([100, 100, 100]), W, H, settings({ ground: "blurred" })).ground!;
    expect(ground.length).toBe(W * H * 4);
    for (let i = 0; i < W * H; i++) expect(ground[i * 4 + 3]).toBe(255);
  });

  it("tones the mean colour with umber", () => {
    const { toned } = analyze(uniform([100, 100, 100]), W, H, settings());
    expect(toned[0]).toBeCloseTo(100 * 0.45 + 120 * 0.55, 9);
    expect(toned[1]).toBeCloseTo(100 * 0.45 + 76 * 0.55, 9);
    expect(toned[2]).toBeCloseTo(100 * 0.45 + 46 * 0.55, 9);
  });

  it("sizes the luminance and tensor fields to the image", () => {
    const a = analyze(uniform([100, 100, 100]), W, H, settings());
    expect(a.src.length).toBe(W * H * 3);
    expect(a.soft.length).toBe(W * H * 3);
    expect(a.L.length).toBe(W * H);
    expect(a.theta.length).toBe(W * H);
    expect(a.strength.length).toBe(W * H);
  });
});
