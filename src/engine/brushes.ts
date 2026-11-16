/**
 * Brushes ported verbatim from docs/reference/brush-bench.html.
 *
 * Covers the stroke code: the `rgb` helper (line 174), `finishColor` (lines 323-334),
 * `refColor` (line 335), `smoothPath` (lines 337-344), `trace` (lines 346-367),
 * `meanColor` (lines 368-372), both brushes' `make`/`draw` (lines 374-428) and
 * `drawGround` (lines 442-446).
 *
 * Each `make` plans a stroke as data and draws from the stroke's own seed, so no shared
 * PRNG state is read here. Arithmetic, loop order and PRNG draw order are frozen to the
 * prototype; do not "fix" them. See ADR-0003 for pixel-hash scope.
 */

import type { Analysis, Ground } from "./analysis.ts";
import { clamp, hsv2rgb, rgb2hsv, shade, type RGB } from "./color.ts";
import { nearest } from "./palette.ts";
import { rngFrom, seedOf, type Rng } from "./prng.ts";

export type Ctx2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

export type Point = [number, number];

export interface BrushSettings {
  tol: number;
  maxLen: number;
  colorJitter: number;
  opacity: number;
}

export interface DabStroke {
  b: "dab";
  x: number;
  y: number;
  r: number;
  c: RGB;
  a: number;
}

export interface CurveStroke {
  b: "curve";
  pts: Point[];
  w: number;
  c: RGB;
  a: number;
  seed: number;
}

export type Stroke = DabStroke | CurveStroke;
export type BrushName = Stroke["b"];

export interface GroundPlan {
  type: Ground;
  color: RGB;
  data: Uint8ClampedArray | null;
}

/** Ported from `rgb` (line 174). */
export function rgb(c: RGB): string {
  return `rgb(${clamp(c[0] | 0, 0, 255)},${clamp(c[1] | 0, 0, 255)},${clamp(c[2] | 0, 0, 255)})`;
}

/**
 * Palette snap, then a small seeded HSV jitter.
 *
 * Ported from `finishColor` (lines 323-334). Draw order is load-bearing: the hue, then
 * saturation, then value draws; none are taken when `jitter` is 0.
 */
export function finishColor(c: RGB, rng: Rng, palette: RGB[] | null, jitter: number): RGB {
  if (palette) c = nearest(palette, c).slice() as RGB;
  if (jitter > 0) {
    let [h, s, v] = rgb2hsv(c[0], c[1], c[2]);
    h = (h + (rng() - 0.5) * jitter * 0.5 + 1) % 1;
    s = clamp(s * (1 + (rng() - 0.5) * jitter * 2), 0, 1);
    v = clamp(v * (1 + (rng() - 0.5) * jitter * 2), 0, 1);
    c = hsv2rgb(h, s, v);
  }
  return c;
}

/** Ported from `refColor` (line 335), with the width passed in instead of read from `A`. */
export function refColor(ref: Float32Array, x: number, y: number, W: number): RGB {
  const i = ((y | 0) * W + (x | 0)) * 3;
  return [ref[i]!, ref[i + 1]!, ref[i + 2]!];
}

/** Ported from `smoothPath` (lines 337-344). */
export function smoothPath(ctx: Ctx2D, pts: Point[]): void {
  ctx.beginPath();
  ctx.moveTo(pts[0]![0], pts[0]![1]);
  for (let i = 1; i < pts.length - 1; i++) {
    ctx.quadraticCurveTo(
      pts[i]![0],
      pts[i]![1],
      (pts[i]![0] + pts[i + 1]![0]) / 2,
      (pts[i]![1] + pts[i + 1]![1]) / 2,
    );
  }
  const l = pts[pts.length - 1]!;
  ctx.lineTo(l[0], l[1]);
}

/**
 * Grows a path both ways from (x, y) along a direction field.
 *
 * Ported from `trace` (lines 346-367). `ok(i, px, py, nx, ny, dx, dy)` decides each step;
 * the backward half comes first and the start point sits in the middle.
 */
export function trace(
  x: number,
  y: number,
  theta: Float32Array,
  step: number,
  maxSteps: number,
  ok: (
    i: number,
    px: number,
    py: number,
    nx: number,
    ny: number,
    dx: number,
    dy: number,
  ) => boolean,
  W: number,
  H: number,
): Point[] {
  const at = (px: number, py: number) => clamp(py | 0, 0, H - 1) * W + clamp(px | 0, 0, W - 1);
  const i0 = at(x, y);
  const grow = (sgn: number) => {
    const out: Point[] = [];
    let px = x,
      py = y,
      ldx = Math.cos(theta[i0]!) * sgn,
      ldy = Math.sin(theta[i0]!) * sgn;
    for (let k = 0; k < maxSteps; k++) {
      const i = at(px, py);
      let dx = Math.cos(theta[i]!),
        dy = Math.sin(theta[i]!);
      if (dx * ldx + dy * ldy < 0) {
        dx = -dx;
        dy = -dy;
      }
      dx = 0.6 * dx + 0.4 * ldx;
      dy = 0.6 * dy + 0.4 * ldy;
      const l = Math.hypot(dx, dy) || 1;
      dx /= l;
      dy /= l;
      const nx = px + dx * step,
        ny = py + dy * step;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) break;
      if (!ok(at(nx, ny), px, py, nx, ny, dx, dy)) break;
      px = nx;
      py = ny;
      ldx = dx;
      ldy = dy;
      out.push([px, py]);
    }
    return out;
  };
  const fwd = grow(1),
    bwd = grow(-1);
  return [...bwd.toReversed(), [x, y], ...fwd];
}

/** Ported from `meanColor` (lines 368-372), with the width passed in instead of read from `A`. */
export function meanColor(img: Float32Array, pts: Point[], W: number): RGB {
  const s = [0, 0, 0];
  for (const p of pts) {
    const i = ((p[1] | 0) * W + (p[0] | 0)) * 3;
    s[0] = s[0]! + img[i]!;
    s[1] = s[1]! + img[i + 1]!;
    s[2] = s[2]! + img[i + 2]!;
  }
  const n = pts.length;
  return [s[0]! / n, s[1]! / n, s[2]! / n];
}

/**
 * Plans a round dab at the sampled color.
 *
 * Ported from `B.dab.make` (lines 374-377). `r` takes one draw, then `finishColor` takes
 * its jitter draws. Like the prototype, the dab ignores the composite `canv`; it takes it
 * only because both brushes share one `make` signature.
 */
export function makeDab(
  x: number,
  y: number,
  R: number,
  ref: Float32Array,
  _canv: Uint8ClampedArray,
  rng: Rng,
  a: Analysis,
  s: BrushSettings,
): DabStroke {
  return {
    b: "dab",
    x,
    y,
    r: R * (0.55 + 0.25 * rng()),
    c: finishColor(refColor(ref, x, y, a.W), rng, a.palette, s.colorJitter),
    a: s.opacity,
  };
}

/**
 * Plans an edge-aware curve: stops before the color under or beside the brush drifts past
 * the tolerance.
 *
 * Ported from `B.curve.make` (lines 379-404). `finishColor` takes the color jitter draws,
 * then `seedOf` takes one more.
 */
export function makeCurve(
  x: number,
  y: number,
  R: number,
  ref: Float32Array,
  canv: Uint8ClampedArray,
  rng: Rng,
  a: Analysis,
  s: BrushSettings,
): CurveStroke {
  const W = a.W,
    H = a.H,
    w = R * 1.4,
    step = R * 0.75,
    lat = w * 0.45,
    tol = s.tol;
  const at = (px: number, py: number) => clamp(py | 0, 0, H - 1) * W + clamp(px | 0, 0, W - 1);
  const i0 = at(x, y),
    base: RGB = [ref[i0 * 3]!, ref[i0 * 3 + 1]!, ref[i0 * 3 + 2]!];
  const far = (i: number, q: RGB) =>
    Math.hypot(ref[i * 3]! - q[0], ref[i * 3 + 1]! - q[1], ref[i * 3 + 2]! - q[2]);
  const fits = (px: number, py: number, nx: number, ny: number) =>
    far(at(px, py), base) <= tol &&
    far(at(px + nx * lat, py + ny * lat), base) <= tol &&
    far(at(px - nx * lat, py - ny * lat), base) <= tol;
  const pts =
    a.strength[i0]! < 1
      ? [[x, y] as Point]
      : trace(
          x,
          y,
          a.theta,
          step,
          Math.ceil(s.maxLen / 2),
          (j, px, py, nx, ny, dx, dy) =>
            a.strength[at(px, py)]! >= 1 &&
            fits((px + nx) / 2, (py + ny) / 2, -dy, dx) &&
            fits(nx, ny, -dy, dx) &&
            !(far(j, [canv[j * 4]!, canv[j * 4 + 1]!, canv[j * 4 + 2]!]) < far(j, base)),
          W,
          H,
        );
  return {
    b: "curve",
    pts,
    w,
    c: finishColor(meanColor(ref, pts, W), rng, a.palette, s.colorJitter),
    a: s.opacity,
    seed: seedOf(rng),
  };
}

/**
 * Rasterizes one planned stroke.
 *
 * Ported from `B.dab.draw` (lines 378-382) and `B.curve.draw` (lines 404-428). The curve
 * body is deterministic from `s.seed` alone.
 */
export function drawStroke(ctx: Ctx2D, s: Stroke): void {
  if (s.b === "dab") {
    ctx.globalAlpha = s.a;
    ctx.fillStyle = rgb(s.c);
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  const r = rngFrom(s.seed),
    pts = s.pts,
    w = s.w;
  if (pts.length < 2) {
    ctx.globalAlpha = s.a;
    ctx.fillStyle = rgb(s.c);
    ctx.beginPath();
    ctx.arc(pts[0]![0], pts[0]![1], w * 0.45, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  const nrm = pts.map((_, i): Point => {
    const a = pts[Math.max(0, i - 1)]!,
      b = pts[Math.min(pts.length - 1, i + 1)]!;
    const dx = b[0] - a[0],
      dy = b[1] - a[1],
      l = Math.hypot(dx, dy) || 1;
    return [-dy / l, dx / l];
  });
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.globalAlpha = s.a * 0.6;
  ctx.strokeStyle = rgb(s.c);
  ctx.lineWidth = w;
  smoothPath(ctx, pts);
  ctx.stroke();
  const n = clamp(Math.round(w / 2.2), 1, 12);
  if (n < 2) return;
  ctx.lineWidth = Math.max(0.8, (w / n) * 1.4);
  for (let k = 0; k < n; k++) {
    const o = ((k + 0.5) / n - 0.5) * w * 0.85;
    let m = pts.length;
    if (m > 2 && r() < 0.35) m--;
    const off = pts
      .slice(0, m)
      .map((p, i): Point => [p[0] + nrm[i]![0] * o, p[1] + nrm[i]![1] * o]);
    ctx.strokeStyle = rgb(shade(s.c, (r() - 0.5) * 0.18));
    ctx.globalAlpha = s.a * (0.45 + 0.5 * r());
    smoothPath(ctx, off);
    ctx.stroke();
  }
}

/** Ported from `drawGround` (lines 442-446), with the dimensions passed in instead of `A`. */
export function drawGround(ctx: Ctx2D, g: GroundPlan, W: number, H: number): void {
  ctx.globalAlpha = 1;
  if (g.type === "blurred")
    ctx.putImageData(new ImageData(new Uint8ClampedArray(g.data!), W, H), 0, 0);
  else {
    ctx.fillStyle = g.type === "toned" ? rgb(g.color) : "#f6f4ef";
    ctx.fillRect(0, 0, W, H);
  }
}
