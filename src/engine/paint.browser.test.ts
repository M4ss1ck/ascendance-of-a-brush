import { describe, expect, it } from "vitest";
import { fnv1a } from "../testing/fnv1a.ts";
import { drawGround, type BrushName, type GroundPlan } from "./brushes.ts";
import type {
  PaintReply,
  PaintRequest,
  PaintSettings,
  ReplayReply,
  ReplayRequest,
} from "./paint.ts";

// Pins the ported layer loop (docs/reference/brush-bench.html lines 478-521) inside the
// worker from ADR-0010: two runs of the same input must give the same raster, and replaying
// the returned plan must reproduce it from the stroke list alone (ADR-0002).

interface Fixture {
  W: number;
  H: number;
  pixels: Uint8ClampedArray;
}

/** Light background, a dark filled square and a 1px dark line. */
const squareAndLine = (): Fixture => {
  const W = 32,
    H = 32,
    N = W * H;
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
  return { W, H, pixels: px };
};

/** A ramp on every channel, plus a hard vertical band and a hard diagonal. */
const gradient = (): Fixture => {
  const W = 40,
    H = 30;
  const px = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      px[i] = (x * 6) & 255;
      px[i + 1] = (y * 8) & 255;
      px[i + 2] = x === 20 || x - y === 5 ? 255 : 40;
      px[i + 3] = 255;
    }
  return { W, H, pixels: px };
};

/** Prototype defaults (brush-bench.html line 624), minus the working size. */
const settings: PaintSettings = {
  seed: 7,
  maxR: 24,
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

function inWorker<T>(request: PaintRequest | ReplayRequest): Promise<T> {
  return new Promise((resolve, reject) => {
    const w = new Worker(new URL("./painter.worker.ts", import.meta.url), { type: "module" });
    w.addEventListener("message", (e: MessageEvent<T>) => {
      w.terminate();
      resolve(e.data);
    });
    w.addEventListener("error", (e) => {
      w.terminate();
      reject(new Error(e.message));
    });
    w.postMessage(request);
  });
}

const paintInWorker = (f: Fixture, s: PaintSettings, brush: BrushName) =>
  inWorker<PaintReply>({ kind: "paint", pixels: f.pixels, W: f.W, H: f.H, settings: s, brush });

const replayInWorker = (request: ReplayRequest) => inWorker<ReplayReply>(request);

/** The same ground the plan stores, drawn on its own, so "not bare ground" is measurable. */
function groundHash(g: GroundPlan, W: number, H: number): string {
  const ctx = new OffscreenCanvas(W, H).getContext("2d", { willReadFrequently: true })!;
  drawGround(ctx, g, W, H);
  return fnv1a(ctx.getImageData(0, 0, W, H).data);
}

/** Paints twice, then replays the first plan, and returns the three rasters' hashes. */
async function paintTwiceAndReplay(f: Fixture, s: PaintSettings, brush: BrushName) {
  const first = await paintInWorker(f, s, brush);
  const second = await paintInWorker(f, s, brush);
  const replayed = await replayInWorker({ kind: "replay", plan: first.plan, W: f.W, H: f.H });

  return {
    plan: first.plan,
    painted: fnv1a(first.pixels),
    again: fnv1a(second.pixels),
    replayed: fnv1a(replayed.pixels),
    ground: groundHash(first.plan.ground, f.W, f.H),
  };
}

describe("paint", () => {
  it("paints a square and a line with dabs deterministically", async () => {
    const r = await paintTwiceAndReplay(squareAndLine(), settings, "dab");

    expect(r.again).toBe(r.painted);
    expect(r.painted).not.toBe(r.ground);
    expect(r.replayed).toBe(r.painted);
    expect(structuredClone(r.plan)).toStrictEqual(r.plan);
  });

  it("paints a square and a line with curves deterministically", async () => {
    const r = await paintTwiceAndReplay(squareAndLine(), settings, "curve");

    expect(r.again).toBe(r.painted);
    expect(r.painted).not.toBe(r.ground);
    expect(r.replayed).toBe(r.painted);
    expect(structuredClone(r.plan)).toStrictEqual(r.plan);
  });

  it("paints a gradient with dabs deterministically", async () => {
    const r = await paintTwiceAndReplay(gradient(), settings, "dab");

    expect(r.again).toBe(r.painted);
    expect(r.painted).not.toBe(r.ground);
    expect(r.replayed).toBe(r.painted);
    expect(structuredClone(r.plan)).toStrictEqual(r.plan);
  });

  it("paints a gradient with curves deterministically", async () => {
    const r = await paintTwiceAndReplay(gradient(), settings, "curve");

    expect(r.again).toBe(r.painted);
    expect(r.painted).not.toBe(r.ground);
    expect(r.replayed).toBe(r.painted);
    expect(structuredClone(r.plan)).toStrictEqual(r.plan);
  });

  it("paints a blurred underpainting with a palette deterministically", async () => {
    const s: PaintSettings = { ...settings, ground: "blurred", palette: 4 };
    const r = await paintTwiceAndReplay(gradient(), s, "curve");

    expect(r.again).toBe(r.painted);
    expect(r.replayed).toBe(r.painted);
  });
});
