/**
 * The empty-state showcase: the demo book painted cycle after cycle on the frame's canvas.
 * Its own worker plans one cycle ahead, and each cycle paints, holds and fades on the wall.
 * See ADR-0018.
 */

import { drawStroke, type BrushName, type Stroke } from "../engine/brushes.ts";
import type { LayerProgress, PaintReply } from "../engine/paint.ts";
import { cyclePhase, DEMO_H, DEMO_W, demoCycle, demoRequest, WALL } from "./demo.ts";

export function startShowcase(
  canvas: HTMLCanvasElement,
  onBrush: (brush: BrushName | null) => void,
): { stop(): void } {
  canvas.width = DEMO_W;
  canvas.height = DEMO_H;
  const ctx = canvas.getContext("2d")!;

  const wall = (): void => {
    ctx.globalAlpha = 1;
    ctx.fillStyle = WALL;
    ctx.fillRect(0, 0, DEMO_W, DEMO_H);
  };
  wall();

  let stopped = false;
  let frame = 0;
  /** The plans asked for and not answered yet, oldest first; the worker replies in order. */
  const pending: ((strokes: Stroke[]) => void)[] = [];

  const worker = new Worker(new URL("../engine/painter.worker.ts", import.meta.url), {
    type: "module",
  });
  worker.addEventListener("message", (event: MessageEvent<LayerProgress | PaintReply>) => {
    const message = event.data;
    if (message.kind === "layer") {
      message.snapshot.close();
      return;
    }
    pending.shift()?.(message.plan.strokes);
  });

  /** Asks the worker for cycle `n`; resolves with its strokes when the reply arrives. */
  const request = (n: number): Promise<Stroke[]> => {
    const { brush, seed } = demoCycle(n);
    return new Promise((resolve) => {
      pending.push(resolve);
      worker.postMessage(demoRequest(brush, seed));
    });
  };

  const stop = (): void => {
    if (stopped) return;
    stopped = true;
    cancelAnimationFrame(frame);
    worker.terminate();
    onBrush(null);
  };

  if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
    // One finished Curved painting; nothing moves and no brush glints.
    void request(1).then((strokes) => {
      if (stopped) return;
      wall();
      for (const stroke of strokes) drawStroke(ctx, stroke);
    });
    return { stop };
  }

  let n = 0;
  let strokes: Stroke[] = [];
  let drawn = 0;
  let startedAt = 0;
  let copy: OffscreenCanvas | null = null;
  let next: Promise<Stroke[]> | null = null;

  /** Waits for cycle `n`'s plan, starts its cycle, and prefetches the one after it. */
  const start = (plan: Promise<Stroke[]>): void => {
    next = request(n + 1);
    void plan.then((list) => {
      if (stopped) return;
      strokes = list;
      drawn = 0;
      copy = null;
      wall();
      onBrush(demoCycle(n).brush);
      startedAt = performance.now();
      frame = requestAnimationFrame(tick);
    });
  };

  const tick = (now: number): void => {
    if (stopped) return;
    const { phase, k } = cyclePhase(now - startedAt);

    if (phase === "paint") {
      const upTo = Math.floor(k * strokes.length);
      for (; drawn < upTo; drawn++) drawStroke(ctx, strokes[drawn]!);
      frame = requestAnimationFrame(tick);
      return;
    }

    if (phase === "hold") {
      for (; drawn < strokes.length; drawn++) drawStroke(ctx, strokes[drawn]!);
      if (!copy) {
        copy = new OffscreenCanvas(DEMO_W, DEMO_H);
        copy.getContext("2d")!.drawImage(canvas, 0, 0);
      }
      frame = requestAnimationFrame(tick);
      return;
    }

    if (phase === "fade") {
      wall();
      if (copy) {
        ctx.globalAlpha = 1 - k;
        ctx.drawImage(copy, 0, 0);
        ctx.globalAlpha = 1;
      }
      frame = requestAnimationFrame(tick);
      return;
    }

    // Done: the wall goes blank until the next plan arrives.
    wall();
    n += 1;
    if (next) start(next);
  };

  start(request(0));

  return { stop };
}
