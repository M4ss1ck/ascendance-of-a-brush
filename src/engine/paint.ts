/**
 * The layer planner and its replayer, ported verbatim from docs/reference/brush-bench.html.
 *
 * Covers `paint` (lines 478-521) minus the UI concerns (yielding, `renderId`, timing,
 * stats, score) and `replay` (lines 552-560) minus the animation. The layer loop reads the
 * canvas as painted by the earlier layers, so planning and rasterizing share one `ctx`
 * (ADR-0002, ADR-0010).
 *
 * Loop order, arithmetic and PRNG draw order are frozen to the prototype; do not "fix"
 * them. See ADR-0003 for pixel-hash scope.
 */

import type { Analysis, AnalysisSettings } from "./analysis.ts";
import {
  drawGround,
  drawStroke,
  makeCurve,
  makeDab,
  type BrushName,
  type BrushSettings,
  type Ctx2D,
  type GroundPlan,
  type Stroke,
} from "./brushes.ts";
import { clamp } from "./color.ts";
import { rngFrom } from "./prng.ts";
import type { Mask, Rect, Selection } from "./selection.ts";

export interface PaintSettings extends AnalysisSettings, BrushSettings {
  threshold: number;
  jitter: number;
}

export interface Plan {
  ground: GroundPlan;
  strokes: Stroke[];
}

/**
 * Plans every layer and paints it onto `ctx`.
 *
 * Ported from `paint` (lines 478-521). Each layer reads the canvas back before scanning
 * the grid, so a stroke's color and the curve's stop rule see the earlier layers. The two
 * jitter draws happen for every cell, before the threshold test, even when the cell is
 * skipped; the shuffle reuses the same layer PRNG.
 *
 * With a `mask` (ADR-0009) a cell's error is averaged over its mask pixels only, the ground
 * is laid only inside the mask, and a stroke is planned only when its jittered, clamped
 * start point is inside it. Strokes are not clipped, so they may bleed past the outline. A
 * null mask is the whole image and reproduces the prototype exactly.
 */
export function paint(
  ctx: Ctx2D,
  a: Analysis,
  s: PaintSettings,
  brush: BrushName,
  mask: Mask | null = null,
): Plan {
  const W = a.W,
    H = a.H;
  const ground: GroundPlan = { type: s.ground, color: a.toned, data: a.ground };
  if (mask) ground.mask = mask;
  drawGround(ctx, ground, W, H);
  const strokes: Stroke[] = [];
  for (let li = 0; li < a.radii.length; li++) {
    const R = a.radii[li]!,
      ref = a.refs[li]!;
    const canv = ctx.getImageData(0, 0, W, H).data;
    const rng = rngFrom(s.seed, li * 1009 + 1);
    const grid = Math.max(2, Math.round(R));
    const ls: Stroke[] = [];
    for (let gy = 0; gy < H; gy += grid)
      for (let gx = 0; gx < W; gx += grid) {
        let sum = 0,
          n = 0,
          maxE = -1,
          mx = gx,
          my = gy;
        const ey = Math.min(H, gy + grid),
          ex = Math.min(W, gx + grid);
        for (let y = gy; y < ey; y++)
          for (let x = gx; x < ex; x++) {
            const i = y * W + x;
            if (mask && !mask[i]) continue;
            const e = Math.hypot(
              ref[i * 3]! - canv[i * 4]!,
              ref[i * 3 + 1]! - canv[i * 4 + 1]!,
              ref[i * 3 + 2]! - canv[i * 4 + 2]!,
            );
            sum += e;
            n++;
            if (e > maxE) {
              maxE = e;
              mx = x;
              my = y;
            }
          }
        const jx = (rng() - 0.5) * s.jitter * grid,
          jy = (rng() - 0.5) * s.jitter * grid;
        const sx = clamp(mx + jx, 0, W - 1),
          sy = clamp(my + jy, 0, H - 1);
        if (
          n > 0 &&
          (li === 0 || sum / n > s.threshold) &&
          (!mask || mask[(sy | 0) * W + (sx | 0)])
        ) {
          ls.push(
            brush === "dab"
              ? makeDab(sx, sy, R, ref, canv, rng, a, s)
              : makeCurve(sx, sy, R, ref, canv, rng, a, s),
          );
        }
      }
    for (let i = ls.length - 1; i > 0; i--) {
      const j = (rng() * (i + 1)) | 0;
      [ls[i], ls[j]] = [ls[j]!, ls[i]!];
    }
    for (const st of ls) {
      drawStroke(ctx, st);
      strokes.push(st);
    }
  }
  return { ground, strokes };
}

/** Redraws a stored plan from scratch. Ported from `replay` (lines 552-560), minus the animation. */
export function replay(ctx: Ctx2D, plan: Plan, W: number, H: number): void {
  drawGround(ctx, plan.ground, W, H);
  for (const s of plan.strokes) drawStroke(ctx, s);
}

/** Asks the paint worker to analyze, plan and paint one image; it replies with the plan and its raster. */
export interface PaintRequest {
  kind: "paint";
  pixels: Uint8ClampedArray;
  W: number;
  H: number;
  settings: PaintSettings;
  brush: BrushName;
  /** Absent means the whole image. */
  selection?: Selection;
}

export interface PaintReply {
  plan: Plan;
  /** The cropped RGBA raster: `crop.w * crop.h * 4` bytes. */
  pixels: Uint8ClampedArray;
  crop: Rect;
}

/** Asks the paint worker to replay a stored plan; it replies with the raster. */
export interface ReplayRequest {
  kind: "replay";
  plan: Plan;
  W: number;
  H: number;
}

export interface ReplayReply {
  /** The cropped RGBA raster: `crop.w * crop.h * 4` bytes. */
  pixels: Uint8ClampedArray;
  crop: Rect;
}
