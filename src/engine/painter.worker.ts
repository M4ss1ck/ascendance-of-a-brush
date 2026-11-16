import { analyze } from "./analysis.ts";
import {
  paint,
  replay,
  type PaintReply,
  type PaintRequest,
  type ReplayReply,
  type ReplayRequest,
} from "./paint.ts";

// tsconfig loads DOM and WebWorker libs together, which types `self` as Window.
// Every *.worker.ts redeclares it so worker-only APIs type-check correctly.
declare const self: DedicatedWorkerGlobalScope;

/** ADR-0010: planner and renderer share one OffscreenCanvas raster inside the worker. */
const context2d = (W: number, H: number): OffscreenCanvasRenderingContext2D =>
  new OffscreenCanvas(W, H).getContext("2d", { willReadFrequently: true })!;

self.addEventListener("message", (e: MessageEvent<PaintRequest | ReplayRequest>) => {
  const msg = e.data;
  const ctx = context2d(msg.W, msg.H);

  if (msg.kind === "paint") {
    const a = analyze(msg.pixels, msg.W, msg.H, msg.settings);
    const plan = paint(ctx, a, msg.settings, msg.brush);
    const pixels = ctx.getImageData(0, 0, msg.W, msg.H).data;
    const reply: PaintReply = { plan, pixels };
    self.postMessage(reply, { transfer: [pixels.buffer as ArrayBuffer] });
    return;
  }

  replay(ctx, msg.plan, msg.W, msg.H);
  const pixels = ctx.getImageData(0, 0, msg.W, msg.H).data;
  const reply: ReplayReply = { pixels };
  self.postMessage(reply, { transfer: [pixels.buffer as ArrayBuffer] });
});
