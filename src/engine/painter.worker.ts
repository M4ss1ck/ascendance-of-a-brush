import { analyze } from "./analysis.ts";
import {
  paint,
  replay,
  type PaintReply,
  type PaintRequest,
  type ReplayReply,
  type ReplayRequest,
} from "./paint.ts";
import { paintedBounds, toMask } from "./selection.ts";

// tsconfig loads DOM and WebWorker libs together, which types `self` as Window.
// Every *.worker.ts redeclares it so worker-only APIs type-check correctly.
declare const self: DedicatedWorkerGlobalScope;

/** ADR-0010: planner and renderer share one OffscreenCanvas raster inside the worker. */
const context2d = (W: number, H: number): OffscreenCanvasRenderingContext2D =>
  new OffscreenCanvas(W, H).getContext("2d", { willReadFrequently: true })!;

self.addEventListener("message", (e: MessageEvent<PaintRequest | ReplayRequest>) => {
  const msg = e.data;
  const ctx = context2d(msg.W, msg.H);

  /** ADR-0009: reply with the painted object only, cropped to its painted bounds. */
  const cropped = () => {
    const full = ctx.getImageData(0, 0, msg.W, msg.H).data;
    const crop = paintedBounds(full, msg.W, msg.H);
    const pixels =
      crop.w && crop.h
        ? ctx.getImageData(crop.x, crop.y, crop.w, crop.h).data
        : new Uint8ClampedArray(0);
    return { pixels, crop };
  };

  if (msg.kind === "paint") {
    const a = analyze(msg.pixels, msg.W, msg.H, msg.settings);
    const mask = msg.selection ? toMask(msg.selection, msg.W, msg.H) : null;
    const plan = paint(ctx, a, msg.settings, msg.brush, mask);
    const { pixels, crop } = cropped();
    const reply: PaintReply = { plan, pixels, crop };
    self.postMessage(reply, { transfer: [pixels.buffer as ArrayBuffer] });
    return;
  }

  replay(ctx, msg.plan, msg.W, msg.H);
  const { pixels, crop } = cropped();
  const reply: ReplayReply = { pixels, crop };
  self.postMessage(reply, { transfer: [pixels.buffer as ArrayBuffer] });
});
