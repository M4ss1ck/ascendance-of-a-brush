import { drawStroke, type BrushName, type Ctx2D, type Point } from "../engine/brushes.ts";
import type { RGB } from "../engine/color.ts";
import { rngFrom } from "../engine/prng.ts";

// A brush pick: the whole rect filled edge to edge with that brush's own strokes, coarse
// layer then fine, in tones of the theme blue. Rewritten from the prototype's
// `brushSwatchRect` (variant D); the PRNG seed, salts and draw order are kept so every pick
// is a fixed picture. ADR-0017: never an image preview, never one lone stroke.

/** Coarse layer first, then the fine one that fills the gaps. */
const COARSE_R = 9;
const RADII = [COARSE_R, 4.5];

/** Curved strokes flow along a gentle diagonal wave across the swatch. */
const angle = (x: number, y: number): number => -0.35 + 0.55 * Math.sin(x * 0.07 + y * 0.05);

/** Draws one brush pick into `ctx`, in CSS pixels, covering (0, 0, W, H). */
export function drawSwatch(ctx: Ctx2D, brush: BrushName, W: number, H: number): void {
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, W, H);
  ctx.clip();

  const rng = rngFrom(17, brush === "dab" ? 1 : 2);
  const tone = (): RGB => {
    const k = 0.55 + rng() * 0.95;
    return [Math.min(255, 44 * k + 18), Math.min(255, 74 * k + 10), Math.min(255, 143 * k)];
  };

  for (const R of RADII) {
    const grid = Math.max(2, Math.round(R));
    for (let gy = -grid; gy < H + grid; gy += grid) {
      for (let gx = -grid; gx < W + grid; gx += grid) {
        if (R < COARSE_R && rng() < 0.45) continue;
        const x = gx + (rng() - 0.5) * grid;
        const y = gy + (rng() - 0.5) * grid;
        if (brush === "dab") {
          drawStroke(ctx, { b: "dab", x, y, r: R, c: tone(), a: 0.9 });
        } else {
          const pts: Point[] = [[x, y]];
          for (let i = 0; i < 6; i++) {
            const [px, py] = pts.at(-1)!;
            const t = angle(px, py);
            pts.push([px + Math.cos(t) * R * 0.9, py + Math.sin(t) * R * 0.9]);
          }
          drawStroke(ctx, {
            b: "curve",
            pts,
            w: R * 1.6,
            c: tone(),
            a: 0.9,
            seed: (rng() * 1e9) | 0,
          });
        }
      }
    }
  }

  ctx.restore();
}
