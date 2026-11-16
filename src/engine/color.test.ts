import { describe, expect, it } from "vitest";
import { type RGB, clamp, hsv2rgb, rgb2hsv, shade } from "./color.ts";

describe("clamp", () => {
  it("returns the lower bound when below range", () => {
    expect(clamp(-5, 0, 255)).toBe(0);
  });

  it("returns the value inside range", () => {
    expect(clamp(128, 0, 255)).toBe(128);
  });

  it("returns the upper bound when above range", () => {
    expect(clamp(300, 0, 255)).toBe(255);
  });
});

describe("shade", () => {
  it("scales every channel by 1 + f", () => {
    expect(shade([100, 50, 0], 0.5)).toEqual([150, 75, 0]);
  });
});

describe("rgb2hsv / hsv2rgb", () => {
  it.each<[string, RGB]>([
    ["red", [255, 0, 0]],
    ["green", [0, 255, 0]],
    ["blue", [0, 0, 255]],
  ])("pins %s", (_name, c) => {
    const expectedH = c[0] === 255 ? 0 : c[1] === 255 ? 1 / 3 : 2 / 3;
    const [h, s, v] = rgb2hsv(c[0], c[1], c[2]);
    expect(h).toBeCloseTo(expectedH, 15);
    expect(s).toBe(1);
    expect(v).toBe(1);
  });

  it.each<[string, RGB]>([
    ["sector near 30 degrees", [255, 128, 0]],
    ["sector near 90 degrees", [128, 255, 0]],
    ["sector near 150 degrees", [0, 255, 128]],
    ["sector near 210 degrees", [0, 128, 255]],
    ["sector near 270 degrees", [128, 0, 255]],
    ["sector near 330 degrees", [255, 0, 128]],
    ["grey", [128, 128, 128]],
    ["black", [0, 0, 0]],
  ])("round trips %s", (_name, c) => {
    const [h, s, v] = rgb2hsv(c[0], c[1], c[2]);
    const back = hsv2rgb(h, s, v);
    expect(back[0]).toBeCloseTo(c[0], 9);
    expect(back[1]).toBeCloseTo(c[1], 9);
    expect(back[2]).toBeCloseTo(c[2], 9);
  });
});
