/**
 * The empty-state demo: a synthetic gold open book, painted by the real planner.
 *
 * The subject is drawn on an OffscreenCanvas and handed to the existing "paint" request with
 * a polygon selection tracing both pages, so the mask keeps the strokes on the gold and the
 * wall shows around them (ADR-0009). The demo then paints, holds and fades one cycle.
 */

import type { BrushName, Point } from "../engine/brushes.ts";
import type { PaintRequest } from "../engine/paint.ts";
import { DEFAULTS } from "./settings.ts";

export const DEMO_W = 480;
export const DEMO_H = 360;
export const PAINT_MS = 6000;
export const HOLD_MS = 2000;
export const FADE_MS = 1000;
/** The page background, left visible around and between the strokes. */
export const WALL = "#2c4a8f";

/** The canvas fill the gold pages sit on. */
const BRONZE = "#4a3412";
/** Page shades, spine to edge: dark beside the fold, gold in the middle, light at the rim. */
const DEEP = "#7a5a20";
const GOLD = "#c9a24a";
const LIGHT = "#e8cf88";

/** One page: a filled page shape plus seven ruled lines. `dir` is -1 for the left page. */
const page = (ctx: OffscreenCanvasRenderingContext2D, dir: number): void => {
  const g = ctx.createLinearGradient(DEMO_W / 2, 0, DEMO_W / 2 + dir * 200, 0);
  g.addColorStop(0, DEEP);
  g.addColorStop(0.25, GOLD);
  g.addColorStop(1, LIGHT);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(DEMO_W / 2, 95);
  ctx.quadraticCurveTo(DEMO_W / 2 + dir * 90, 55, DEMO_W / 2 + dir * 205, 80);
  ctx.lineTo(DEMO_W / 2 + dir * 205, 290);
  ctx.quadraticCurveTo(DEMO_W / 2 + dir * 90, 265, DEMO_W / 2, 305);
  ctx.fill();
  ctx.strokeStyle = DEEP;
  ctx.lineWidth = 5;
  for (let k = 0; k < 7; k++) {
    const y = 115 + k * 24;
    ctx.beginPath();
    ctx.moveTo(DEMO_W / 2 + dir * 30, y + 6);
    ctx.quadraticCurveTo(
      DEMO_W / 2 + dir * 95,
      y - 14,
      DEMO_W / 2 + dir * (150 + (k % 3) * 12),
      y - 4,
    );
    ctx.stroke();
  }
};

/** Fills the whole canvas with bronze, then draws the two pages on it. */
export function drawBook(ctx: OffscreenCanvasRenderingContext2D): void {
  ctx.fillStyle = BRONZE;
  ctx.fillRect(0, 0, DEMO_W, DEMO_H);
  page(ctx, -1);
  page(ctx, 1);
}

/** Quadratic samples per curve; the start point and the closing repeat are the caller's. */
const SEGMENTS = 16;

/** Appends the quadratic from `from` to `to`, control `ctrl`, sampled at `SEGMENTS`. */
function quad(from: Point, ctrl: Point, to: Point, out: Point[]): void {
  for (let i = 1; i <= SEGMENTS; i++) {
    const t = i / SEGMENTS,
      u = 1 - t;
    out.push([
      u * u * from[0] + 2 * u * t * ctrl[0] + t * t * to[0],
      u * u * from[1] + 2 * u * t * ctrl[1] + t * t * to[1],
    ]);
  }
}

/**
 * The closed polygon around both pages, in the order the outline is walked.
 *
 * Each page edge is a 16-segment quadratic; the last one ends on the spine top, which the
 * list already opens with, so that repeat is left out.
 */
export function bookOutline(): Point[] {
  const spineTop: Point = [DEMO_W / 2, 95];
  const leftTop: Point = [DEMO_W / 2 - 205, 80];
  const leftBottom: Point = [DEMO_W / 2 - 205, 290];
  const spineBottom: Point = [DEMO_W / 2, 305];
  const rightBottom: Point = [DEMO_W / 2 + 205, 290];
  const rightTop: Point = [DEMO_W / 2 + 205, 80];

  const pts: Point[] = [spineTop];
  quad(spineTop, [DEMO_W / 2 - 90, 55], leftTop, pts);
  pts.push(leftBottom);
  quad(leftBottom, [DEMO_W / 2 - 90, 265], spineBottom, pts);
  quad(spineBottom, [DEMO_W / 2 + 90, 265], rightBottom, pts);
  pts.push(rightTop);
  const closing: Point[] = [];
  quad(rightTop, [DEMO_W / 2 + 90, 55], spineTop, closing);
  pts.push(...closing.slice(0, -1));
  return pts;
}

/** Cycle `n` (0-based): dabs on even cycles, curves on odd, a fresh seed each time. */
export function demoCycle(n: number): { brush: BrushName; seed: number } {
  return { brush: n % 2 === 0 ? "dab" : "curve", seed: n + 1 };
}

/** How far through a cycle `t` milliseconds are, with the paint share eased out. */
export function cyclePhase(t: number): {
  phase: "paint" | "hold" | "fade" | "done";
  k: number;
} {
  if (t < 0) return { phase: "paint", k: 0 };
  if (t < PAINT_MS) return { phase: "paint", k: 1 - (1 - t / PAINT_MS) ** 2 };
  if (t < PAINT_MS + HOLD_MS) return { phase: "hold", k: 1 };
  if (t < PAINT_MS + HOLD_MS + FADE_MS) {
    return { phase: "fade", k: (t - PAINT_MS - HOLD_MS) / FADE_MS };
  }
  return { phase: "done", k: 1 };
}

/** A ready paint request for the demo book: the drawn source plus its polygon mask. */
export function demoRequest(brush: BrushName, seed: number): PaintRequest {
  const ctx = new OffscreenCanvas(DEMO_W, DEMO_H).getContext("2d", { willReadFrequently: true })!;
  drawBook(ctx);

  return {
    kind: "paint",
    pixels: ctx.getImageData(0, 0, DEMO_W, DEMO_H).data,
    W: DEMO_W,
    H: DEMO_H,
    settings: { ...DEFAULTS, seed },
    brush,
    selection: { kind: "polygon", pts: bookOutline() },
  };
}
