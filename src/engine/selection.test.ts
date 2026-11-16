import { describe, expect, it } from "vitest";
import { toMask, paintedBounds, type Mask, type Selection } from "./selection.ts";

/** Mask as rows of "1"/"0", for readable expectations. */
const rows = (mask: Mask, W: number): string[] => {
  const lines: string[] = [];
  for (let y = 0; y < mask.length; y += W) {
    lines.push(Array.from(mask.slice(y, y + W), (v) => (v ? "1" : "0")).join(""));
  }
  return lines;
};

const maskOf = (sel: Selection, W: number, H: number): Mask => {
  const mask = toMask(sel, W, H);
  expect(mask).not.toBeNull();
  return mask!;
};

describe("toMask", () => {
  it("returns null for the whole image", () => {
    expect(toMask({ kind: "whole" }, 4, 3)).toBeNull();
  });

  it("fills exactly the pixels a rect covers", () => {
    expect(rows(maskOf({ kind: "rect", x: 1, y: 1, w: 3, h: 2 }, 6, 5), 6)).toEqual([
      "000000",
      "011100",
      "011100",
      "000000",
      "000000",
    ]);
  });

  it("clips a rect that hangs off the canvas", () => {
    const mask = maskOf({ kind: "rect", x: -2, y: -3, w: 4, h: 5 }, 3, 3);
    expect(mask.length).toBe(3 * 3);
    expect(rows(mask, 3)).toEqual(["110", "110", "000"]);
  });

  it("fills an ellipse symmetric about its centre and excludes the corners", () => {
    const mask = maskOf({ kind: "ellipse", cx: 3.5, cy: 3.5, rx: 2.5, ry: 2 }, 7, 7);
    expect(rows(mask, 7)).toEqual([
      "0000000",
      "0001000",
      "0111110",
      "0111110",
      "0111110",
      "0001000",
      "0000000",
    ]);
    for (let y = 0; y < 7; y++)
      for (let x = 0; x < 7; x++) expect(mask[y * 7 + x]).toBe(mask[y * 7 + (6 - x)]);
    expect(mask[3 * 7 + 3]).toBe(1);
    for (const corner of [0, 6, 42, 48]) expect(mask[corner]).toBe(0);
  });

  it("fills a triangle polygon, implicitly closed", () => {
    const sel: Selection = {
      kind: "polygon",
      pts: [
        [0, 0],
        [4, 0],
        [0, 4],
      ],
    };
    expect(rows(maskOf(sel, 4, 4), 4)).toEqual(["1110", "1100", "1000", "0000"]);
  });

  it("uses the even-odd rule on a self-intersecting bowtie", () => {
    const sel: Selection = {
      kind: "polygon",
      pts: [
        [0, 0],
        [6, 4],
        [6, 0],
        [0, 4],
      ],
    };
    expect(rows(maskOf(sel, 6, 5), 6)).toEqual(["100001", "110011", "110011", "100001", "000000"]);
  });

  it("gives an empty mask for a polygon with fewer than three points", () => {
    const sel: Selection = {
      kind: "polygon",
      pts: [
        [0, 0],
        [3, 3],
      ],
    };
    const mask = maskOf(sel, 4, 4);
    expect(mask.length).toBe(16);
    expect(mask.every((v) => v === 0)).toBe(true);
  });
});

/** An RGBA raster of transparent pixels with the given ones made opaque. */
const raster = (W: number, H: number, painted: [number, number][]): Uint8ClampedArray => {
  const px = new Uint8ClampedArray(W * H * 4);
  for (const [x, y] of painted) px[(y * W + x) * 4 + 3] = 255;
  return px;
};

describe("paintedBounds", () => {
  it("returns a zero rect when nothing is painted", () => {
    expect(paintedBounds(raster(4, 3, []), 4, 3)).toEqual({ x: 0, y: 0, w: 0, h: 0 });
  });

  it("returns a single pixel as a 1x1 rect", () => {
    expect(paintedBounds(raster(5, 4, [[2, 3]]), 5, 4)).toEqual({ x: 2, y: 3, w: 1, h: 1 });
  });

  it("spans scattered pixels", () => {
    const px = raster(6, 5, [
      [1, 1],
      [4, 2],
      [2, 4],
    ]);
    expect(paintedBounds(px, 6, 5)).toEqual({ x: 1, y: 1, w: 4, h: 4 });
  });

  it("gives the full canvas when every pixel is opaque", () => {
    const px = new Uint8ClampedArray(4 * 3 * 4).fill(255);
    expect(paintedBounds(px, 4, 3)).toEqual({ x: 0, y: 0, w: 4, h: 3 });
  });

  it("counts alpha 1 as painted", () => {
    const px = new Uint8ClampedArray(4 * 4 * 4);
    px[(2 * 4 + 3) * 4 + 3] = 1;
    expect(paintedBounds(px, 4, 4)).toEqual({ x: 3, y: 2, w: 1, h: 1 });
  });
});
