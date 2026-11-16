import { describe, expect, it } from "vitest";
import { tensor } from "./tensor.ts";

const W = 21,
  H = 21,
  R = 2;

/** theta is a tangent angle, so it is only meaningful modulo PI. */
const modPi = (t: number) => ((t % Math.PI) + Math.PI) % Math.PI;

const build = (v: (x: number, y: number) => number): Float32Array => {
  const out = new Float32Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) out[y * W + x] = v(x, y);
  return out;
};

describe("tensor", () => {
  it("returns theta and strength of length W*H", () => {
    const { theta, strength } = tensor(new Float32Array(W * H).fill(128), W, H, R);
    expect(theta.length).toBe(W * H);
    expect(strength.length).toBe(W * H);
  });

  it("is zero everywhere on a flat image", () => {
    const { strength } = tensor(new Float32Array(W * H).fill(128), W, H, R);
    for (let i = 0; i < W * H; i++) expect(strength[i]).toBe(0);
  });

  it("gives a vertical tangent on a vertical edge", () => {
    const L = build((x) => (x < 10 ? 0 : 255));
    const { theta, strength } = tensor(L, W, H, R);
    for (let y = 7; y <= 13; y++) {
      for (const x of [9, 10]) {
        const i = y * W + x;
        expect(strength[i]!).toBeGreaterThan(0);
        expect(Math.abs(modPi(theta[i]!) - Math.PI / 2)).toBeLessThan(1e-3);
      }
    }
  });

  it("gives the (1,1) tangent on a diagonal edge, not its perpendicular", () => {
    const L = build((x, y) => (x > y ? 255 : 0));
    const { theta } = tensor(L, W, H, R);
    for (let d = 7; d <= 13; d++) {
      const neighbours: Array<[number, number]> = [
        [d, d],
        [d + 1, d],
        [d, d + 1],
      ];
      for (const [x, y] of neighbours) {
        const m = modPi(theta[y * W + x]!);
        expect(Math.abs(m - Math.PI / 4)).toBeLessThan(1e-2);
        expect(Math.abs(m - (3 * Math.PI) / 4)).toBeGreaterThan(1e-2);
      }
    }
  });
});
