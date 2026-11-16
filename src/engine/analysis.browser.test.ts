import { describe, expect, it } from "vitest";
import { fnv1a } from "../testing/fnv1a.ts";
import { analyze } from "./analysis.ts";

// Golden hashes were captured by running the prototype's `analyze` helpers
// (docs/reference/brush-bench.html lines 283-315) on this fixture, so they pin the port
// against the approved implementation rather than against itself.

const W = 40,
  H = 30;

function fixture(): Uint8ClampedArray {
  const px = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      px[i] = (x * 6) & 255;
      px[i + 1] = (y * 8) & 255;
      px[i + 2] = x === 20 || x - y === 5 ? 255 : 40;
      px[i + 3] = 255;
    }
  return px;
}

const hashF32 = (t: Float32Array) => fnv1a(new Uint8Array(t.buffer, t.byteOffset, t.byteLength));
const hashVec = (v: number[]) => fnv1a(new Uint8Array(Float64Array.from(v).buffer));
const hashRGB = (v: [number, number, number]) => hashVec([...v]);

describe("analyze", () => {
  const a = analyze(fixture(), W, H, {
    layers: 4,
    maxR: 12,
    palette: 6,
    seed: 7,
    ground: "blurred",
  });

  it("plans the layer radii", () => {
    expect(a.radii).toEqual([12, 6, 3, 1.5]);
  });

  it("hashes the analysis fields", () => {
    expect(hashF32(a.src)).toBe("5921cc99");
    expect(hashF32(a.soft)).toBe("699a81ad");
    expect(a.refs.map(hashF32)).toEqual(["2b6f2a9c", "417111b7", "699a81ad", "5921cc99"]);
    expect(hashF32(a.L)).toBe("74feecc2");
    expect(hashF32(a.theta)).toBe("df71138f");
    expect(hashF32(a.strength)).toBe("788dcc12");
  });

  it("hashes the palette, ground and tone", () => {
    expect(hashVec(a.palette!.flat())).toBe("fce01743");
    expect(fnv1a(a.ground!)).toBe("0c78c60c");
    expect(hashRGB(a.toned)).toBe("900a5944");
  });
});
