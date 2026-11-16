import { analyze } from "./analysis.ts";
import {
  paint,
  replay,
  type LayerProgress,
  type PaintImageRequest,
  type PaintReply,
  type PaintRequest,
  type ReplayReply,
  type ReplayRequest,
} from "./paint.ts";
import { resample } from "./resample.ts";
import { paintedBounds, toMask } from "./selection.ts";

// tsconfig loads DOM and WebWorker libs together, which types `self` as Window.
// Every *.worker.ts redeclares it so worker-only APIs type-check correctly.
declare const self: DedicatedWorkerGlobalScope;

/** ADR-0010: planner and renderer share one OffscreenCanvas raster inside the worker. */
const context2d = (W: number, H: number): OffscreenCanvasRenderingContext2D =>
  new OffscreenCanvas(W, H).getContext("2d", { willReadFrequently: true })!;

/** ADR-0009: reply with the painted object only, cropped to its painted bounds. */
const cropped = (ctx: OffscreenCanvasRenderingContext2D, W: number, H: number) => {
  const full = ctx.getImageData(0, 0, W, H).data;
  const crop = paintedBounds(full, W, H);
  const pixels =
    crop.w && crop.h
      ? ctx.getImageData(crop.x, crop.y, crop.w, crop.h).data
      : new Uint8ClampedArray(0);
  return { pixels, crop };
};

/**
 * The full raster as an owned bitmap. The painting canvas is copied first because
 * `transferToImageBitmap` would seal it for the layers still to come.
 */
const snapshot = (ctx: OffscreenCanvasRenderingContext2D, W: number, H: number): ImageBitmap => {
  const copy = new OffscreenCanvas(W, H);
  copy.getContext("2d")!.drawImage(ctx.canvas, 0, 0);
  return copy.transferToImageBitmap();
};

/** The worker owns an upload, so the bitmap is closed once its pixels are read. */
const resampled = (msg: PaintImageRequest) => {
  const r = resample(msg.bitmap, msg.size);
  msg.bitmap.close();
  return r;
};

self.addEventListener(
  "message",
  (e: MessageEvent<PaintRequest | PaintImageRequest | ReplayRequest>) => {
    const msg = e.data;

    if (msg.kind === "replay") {
      const ctx = context2d(msg.W, msg.H);
      replay(ctx, msg.plan, msg.W, msg.H);
      const { pixels, crop } = cropped(ctx, msg.W, msg.H);
      const reply: ReplayReply = { pixels, crop };
      self.postMessage(reply, { transfer: [pixels.buffer as ArrayBuffer] });
      return;
    }

    // An upload takes the whole-image path: resampling happens here, selection never applies.
    const source = msg.kind === "paint" ? msg : resampled(msg);
    const { W, H } = source;
    const ctx = context2d(W, H);
    const a = analyze(source.pixels, W, H, msg.settings);
    const mask = msg.kind === "paint" && msg.selection ? toMask(msg.selection, W, H) : null;
    const plan = paint(ctx, a, msg.settings, msg.brush, mask, (layer) => {
      const progress: LayerProgress = {
        kind: "layer",
        layer,
        layers: a.radii.length,
        radius: a.radii[layer]!,
        snapshot: snapshot(ctx, W, H),
      };
      self.postMessage(progress, { transfer: [progress.snapshot] });
    });
    const { pixels, crop } = cropped(ctx, W, H);
    const reply: PaintReply = { kind: "painted", plan, pixels, crop };
    self.postMessage(reply, { transfer: [pixels.buffer as ArrayBuffer] });
  },
);
