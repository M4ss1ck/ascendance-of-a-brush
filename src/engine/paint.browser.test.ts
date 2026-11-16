import { describe, expect, it } from "vitest";
import { fnv1a } from "../testing/fnv1a.ts";
import { prototypePaint } from "../testing/prototype.ts";
import { analyze, type Analysis } from "./analysis.ts";
import { drawGround, type BrushName, type GroundPlan } from "./brushes.ts";
import { metricMasks, score } from "./metrics.ts";
import type {
  LayerProgress,
  PaintImageRequest,
  PaintReply,
  PaintRequest,
  PaintSettings,
  ReplayReply,
  ReplayRequest,
} from "./paint.ts";
import { workingSize } from "./resample.ts";
import { type Selection } from "./selection.ts";

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

/**
 * A larger scene so the planner runs closer to its working regime: long curves, many
 * cells per layer and long shuffles. Soft vertical ramp, a disk, a square and thin lines.
 */
const shapes = (): Fixture => {
  const W = 200,
    H = 150;
  const px = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      let c: [number, number, number] = [200 - y * 0.6, 170 - y * 0.3, 120 + y * 0.5];
      if ((x - 60) ** 2 + (y - 70) ** 2 < 35 ** 2) c = [190, 60, 40];
      if (x >= 110 && x <= 170 && y >= 30 && y <= 100) c = [40, 80, 140];
      if (y === 120 && x >= 20 && x <= 180) c = [15, 15, 20];
      if (x - y === 40 && y >= 10 && y <= 140) c = [245, 240, 230];
      const i = (y * W + x) * 4;
      px[i] = c[0];
      px[i + 1] = c[1];
      px[i + 2] = c[2];
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

/** Progress updates arrive before the reply; only the reply, which has no layer field, ends a run. */
const isLayer = (d: unknown): d is LayerProgress =>
  typeof d === "object" && d !== null && (d as { kind?: unknown }).kind === "layer";

/** Runs one request in a fresh worker and resolves with its final reply. */
function inWorker<T>(
  request: PaintRequest | PaintImageRequest | ReplayRequest,
  onLayer?: (progress: LayerProgress) => void,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const w = new Worker(new URL("./painter.worker.ts", import.meta.url), { type: "module" });
    w.addEventListener("message", (e: MessageEvent<LayerProgress | T>) => {
      const data: LayerProgress | T = e.data;
      if (isLayer(data)) {
        onLayer?.(data);
        return;
      }
      w.terminate();
      resolve(data as T);
    });
    w.addEventListener("error", (e) => {
      w.terminate();
      reject(new Error(e.message));
    });
    w.postMessage(request);
  });
}

const paintInWorker = (
  f: Fixture,
  s: PaintSettings,
  brush: BrushName,
  selection?: Selection,
  onLayer?: (progress: LayerProgress) => void,
) =>
  inWorker<PaintReply>(
    {
      kind: "paint",
      pixels: f.pixels,
      W: f.W,
      H: f.H,
      settings: s,
      brush,
      ...(selection ? { selection } : {}),
    },
    onLayer,
  );

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

interface Case {
  id: string;
  fixture: Fixture;
  settings: PaintSettings;
  brush: BrushName;
  /** A masked case exercises the masked-ground path; absent means the whole image. */
  selection?: Selection;
}

const cases = (): Case[] => [
  { id: "square-dab", fixture: squareAndLine(), settings, brush: "dab" },
  { id: "square-curve", fixture: squareAndLine(), settings, brush: "curve" },
  { id: "gradient-dab", fixture: gradient(), settings, brush: "dab" },
  { id: "gradient-curve", fixture: gradient(), settings, brush: "curve" },
];

const parityCases = (): Case[] => [
  ...cases(),
  {
    id: "gradient-blurred-palette-curve",
    fixture: gradient(),
    settings: { ...settings, ground: "blurred", palette: 4 },
    brush: "curve",
  },
  { id: "shapes-dab", fixture: shapes(), settings, brush: "dab" },
  { id: "shapes-curve", fixture: shapes(), settings, brush: "curve" },
  // colorJitter 0 skips finishColor's three draws; "white" is the only other ground fill.
  ...(["dab", "curve"] as const).map((brush): Case => ({
    id: `square-${brush}-no-jitter-white`,
    fixture: squareAndLine(),
    settings: { ...settings, colorJitter: 0, ground: "white" },
    brush,
  })),
  // ADR-0009 rule 5: an all-ones rect mask lays the ground through the masked path and
  // must still reproduce the prototype hash for hash.
  {
    id: "square-curve-all-ones-rect",
    fixture: squareAndLine(),
    settings,
    brush: "curve",
    selection: { kind: "rect", x: 0, y: 0, w: 32, h: 32 },
  },
];

// Runs the approved prototype's own `paint` on the same fixture and settings, so the
// worker's raster and stroke plan are compared with the source of truth, not with a
// restatement of it. See docs/reference/brush-bench.html and AGENTS.md.
describe("prototype parity", () => {
  it.each(parityCases())("$id matches the prototype raster and strokes", async (c) => {
    const worker = await paintInWorker(c.fixture, c.settings, c.brush, c.selection);
    const prototype = await prototypePaint(
      c.fixture.pixels,
      c.fixture.W,
      c.fixture.H,
      c.settings,
      c.brush,
    );

    expect(fnv1a(worker.pixels)).toBe(prototype.hash);
    expect(JSON.parse(JSON.stringify(worker.plan.strokes))).toEqual(prototype.strokes);
  });
});

/** The plan's own ground, drawn alone: "better than bare toned ground" is measurable. */
function tonedGround(a: Analysis): Uint8ClampedArray {
  const ctx = new OffscreenCanvas(a.W, a.H).getContext("2d", { willReadFrequently: true })!;
  drawGround(ctx, { type: "toned", color: a.toned, data: null }, a.W, a.H);
  return ctx.getImageData(0, 0, a.W, a.H).data;
}

// Ceilings are the measured painted scores × 1.1, rounded up to one decimal (ADR-0008).
// Lower is better: the painting must beat the bare toned ground and these drift guards.
const ceilings: Record<string, { all: number; edge: number; line: number }> = {
  "square-dab": { all: 21.3, edge: 112.6, line: 72.5 },
  "square-curve": { all: 20.8, edge: 107.7, line: 70.9 },
  "gradient-dab": { all: 16.9, edge: 39.0, line: 187.4 },
  "gradient-curve": { all: 16.8, edge: 41.7, line: 189.5 },
};

describe("metric thresholds", () => {
  it.each(cases())("$id beats bare ground and its ceiling", async (c) => {
    const a = analyze(c.fixture.pixels, c.fixture.W, c.fixture.H, c.settings);
    const masks = metricMasks(a);
    const worker = await paintInWorker(c.fixture, c.settings, c.brush);
    const painted = score(a, masks, worker.pixels);
    const bare = score(a, masks, tonedGround(a));
    const ceiling = ceilings[c.id]!;

    for (const key of ["all", "edge", "line"] as const) {
      expect(painted[key]).toBeLessThan(bare[key]);
      expect(painted[key]).toBeLessThan(ceiling[key]);
    }
  });
});

// ADR-0009: the reply carries the painted object only, cropped to everything painted. A
// whole-image painting keeps the full canvas, so its raster is byte-identical to before.
describe("selection", () => {
  // An ellipse over the square: smaller than the canvas, with room for strokes to bleed.
  const ellipse: Selection = { kind: "ellipse", cx: 15, cy: 15, rx: 7, ry: 6 };
  // Its mask spans x 8..21 and y 9..20 on the 32px canvas.
  const brushes = ["dab", "curve"] as const;

  it.each(brushes)("%s crops a whole-image painting to the full canvas", async (brush) => {
    const f = squareAndLine();
    const reply = await paintInWorker(f, settings, brush);

    expect(reply.crop).toEqual({ x: 0, y: 0, w: f.W, h: f.H });
    expect(reply.pixels.length).toBe(f.W * f.H * 4);
  });

  // Pinned fixed-seed crops (ADR-0008), each strictly wider than the ellipse mask on some
  // side, so a stroke bled past the outline.
  it.each([
    ["dab", { x: 5, y: 1, w: 27, h: 29 }],
    ["curve", { x: 6, y: 0, w: 26, h: 31 }],
  ] as const)("%s crops a masked painting to the mask plus bleed", async (brush, crop) => {
    const f = squareAndLine();
    const reply = await paintInWorker(f, settings, brush, ellipse);

    expect(reply.crop).toEqual(crop);
    expect(crop.x < 8 || crop.y < 9 || crop.x + crop.w > 22 || crop.y + crop.h > 21).toBe(true);
    expect(reply.pixels.length).toBe(crop.w * crop.h * 4);
  });

  it.each(brushes)("%s replays a masked plan to the same crop and pixels", async (brush) => {
    const f = squareAndLine();
    const reply = await paintInWorker(f, settings, brush, ellipse);
    const replayed = await replayInWorker({ kind: "replay", plan: reply.plan, W: f.W, H: f.H });

    expect(replayed.crop).toEqual(reply.crop);
    expect(fnv1a(replayed.pixels)).toBe(fnv1a(reply.pixels));
  });

  // Pinned fixed-seed hashes of the cropped pixels (ADR-0008).
  it.each([
    ["dab", "50719762"],
    ["curve", "53a625b0"],
  ] as const)("%s pins the cropped pixel hash", async (brush, hash) => {
    const f = squareAndLine();
    const reply = await paintInWorker(f, settings, brush, ellipse);

    expect(fnv1a(reply.pixels)).toBe(hash);
  });

  it.each(brushes)("%s replies a zero crop for an empty selection", async (brush) => {
    const f = squareAndLine();
    const empty: Selection = { kind: "polygon", pts: [] };
    const reply = await paintInWorker(f, settings, brush, empty);

    expect(reply.crop).toEqual({ x: 0, y: 0, w: 0, h: 0 });
    expect(reply.pixels.length).toBe(0);
  });
});

/** Reads a transferred snapshot back, then releases it. */
function snapshotHash(b: ImageBitmap): string {
  const ctx = new OffscreenCanvas(b.width, b.height).getContext("2d", {
    willReadFrequently: true,
  })!;
  ctx.drawImage(b, 0, 0);
  const hash = fnv1a(ctx.getImageData(0, 0, b.width, b.height).data);
  b.close();
  return hash;
}

// Issue #6 "Painting lifecycle": the worker reports every layer with a snapshot of the
// raster after it. The hook is observation only, so the layer messages must account for the
// finished painting exactly and the pinned hashes above must not move.
describe("layer progress", () => {
  it.each(["dab", "curve"] as const)(
    "%s reports each layer and snapshots the finished painting",
    async (brush) => {
      const f = squareAndLine();
      const a = analyze(f.pixels, f.W, f.H, settings);
      const progress: LayerProgress[] = [];
      const reply = await paintInWorker(f, settings, brush, undefined, (p) => progress.push(p));

      expect(progress.map((p) => p.layer)).toEqual(a.radii.map((_, i) => i));
      expect(progress.map((p) => p.layers)).toEqual(a.radii.map(() => a.radii.length));
      expect(progress.map((p) => p.radius)).toEqual(a.radii);
      expect(reply.crop).toEqual({ x: 0, y: 0, w: f.W, h: f.H });

      const last = progress.at(-1)!.snapshot;
      const earlier = progress.slice(0, -1);
      expect(last.width).toBe(f.W);
      expect(last.height).toBe(f.H);
      expect(snapshotHash(last)).toBe(fnv1a(reply.pixels));
      for (const p of earlier) p.snapshot.close();
    },
  );
});

/** An opaque source for the upload tests: a gradient, a disk, a box and a hairline. */
function sourceBitmap(w: number, h: number): ImageBitmap {
  const ctx = new OffscreenCanvas(w, h).getContext("2d", { willReadFrequently: true })!;
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, "#e8d0a0");
  g.addColorStop(1, "#1e3c6a");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#b43c28";
  ctx.beginPath();
  ctx.arc(w * 0.3, h * 0.45, Math.min(w, h) * 0.22, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#28508c";
  ctx.fillRect(w * 0.55, h * 0.18, w * 0.3, h * 0.5);
  ctx.fillStyle = "#14141a";
  ctx.fillRect(0, Math.round(h * 0.8), w, 1);
  return ctx.canvas.transferToImageBitmap();
}

/** An upload with a transparent hole and a half-transparent band; the prototype ignores alpha. */
function alphaBitmap(): ImageBitmap {
  const ctx = new OffscreenCanvas(120, 90).getContext("2d", { willReadFrequently: true })!;
  ctx.fillStyle = "#c8a05a";
  ctx.fillRect(0, 0, 120, 90);
  ctx.clearRect(30, 20, 40, 40);
  ctx.fillStyle = "rgba(30, 70, 150, 0.5)";
  ctx.fillRect(65, 35, 45, 40);
  return ctx.canvas.transferToImageBitmap();
}

/** The prototype's own resampling (brush-bench.html lines 276-282), on the main thread. */
function prototypeResample(src: ImageBitmap, size: number): Fixture {
  const { W, H } = workingSize(src.width, src.height, size);
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(src, 0, 0, W, H);
  return { W, H, pixels: ctx.getImageData(0, 0, W, H).data };
}

/**
 * Paints one upload in the worker, and the same image resampled the prototype way on the main
 * thread as a plain whole-image request. A bitmap is single use: the request transfers it, so
 * each side draws its own.
 */
async function uploadHashes(
  bitmap: () => ImageBitmap,
  size: number,
  brush: BrushName,
): Promise<{ uploaded: string; main: string }> {
  const uploaded = await inWorker<PaintReply>({
    kind: "paintImage",
    bitmap: bitmap(),
    size,
    settings,
    brush,
  });
  const source = bitmap();
  const image = prototypeResample(source, size);
  source.close();
  const main = await paintInWorker(image, settings, brush);
  return { uploaded: fnv1a(uploaded.pixels), main: fnv1a(main.pixels) };
}

// Issue #6 "Input": resampling runs in the worker on an OffscreenCanvas. If it ever drifts from
// the prototype's main-thread `<canvas>` path, these fail and the issue falls back to main.
describe("paintImage", () => {
  it.each([
    [200, 120, 64],
    [200, 120, 96],
    [40, 30, 64],
  ] as const)("%i×%i at %i hashes like the main thread", async (w, h, size) => {
    const r = await uploadHashes(() => sourceBitmap(w, h), size, "curve");

    expect(r.uploaded).toBe(r.main);
  });

  // Pinned fixed-seed hash of an upload with alpha (ADR-0008): alpha is ignored, exactly as in
  // the prototype, which reads only RGB from the resampled raster.
  it("ignores alpha like the prototype", async () => {
    const r = await uploadHashes(alphaBitmap, 64, "curve");

    expect(r.uploaded).toBe(r.main);
    expect(r.uploaded).toBe("79fbe5b6");
  });
});
