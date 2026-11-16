/**
 * A selection resolves to a mask: only strokes whose start point is inside it are planned,
 * and they may bleed past the outline. See ADR-0009.
 */

import type { Point } from "./brushes.ts";

/** What the user chooses to paint, in working-canvas pixels. */
export type Selection =
  | { kind: "whole" }
  | { kind: "rect"; x: number; y: number; w: number; h: number }
  | { kind: "ellipse"; cx: number; cy: number; rx: number; ry: number }
  /**
   * Pencil mode produces a closed `polygon` from its freehand points.
   */
  | { kind: "polygon"; pts: Point[] };

/** One byte per pixel, in row-major order: 1 = inside, 0 = outside. */
export type Mask = Uint8Array;

/** A rectangle in working-canvas pixels. */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * The pixel set a selection covers, testing each pixel at its centre.
 *
 * Returns null for the whole image, which needs no mask. Polygons are implicitly closed and
 * filled by the even-odd rule; fewer than three points give an empty mask.
 */
export function toMask(sel: Selection, W: number, H: number): Mask | null {
  if (sel.kind === "whole") return null;
  const mask = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) {
    const py = y + 0.5;
    for (let x = 0; x < W; x++) {
      const px = x + 0.5;
      let inside = false;
      if (sel.kind === "rect") {
        inside = px >= sel.x && px < sel.x + sel.w && py >= sel.y && py < sel.y + sel.h;
      } else if (sel.kind === "ellipse") {
        const dx = (px - sel.cx) / sel.rx;
        const dy = (py - sel.cy) / sel.ry;
        inside = dx * dx + dy * dy <= 1;
      } else if (sel.pts.length >= 3) {
        // Even-odd ray casting along +x, vertices on the same side of the ray not counted.
        for (let i = 0, j = sel.pts.length - 1; i < sel.pts.length; j = i++) {
          const [xi, yi] = sel.pts[i]!;
          const [xj, yj] = sel.pts[j]!;
          if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
            inside = !inside;
          }
        }
      }
      if (inside) mask[y * W + x] = 1;
    }
  }
  return mask;
}

/**
 * The smallest rect holding every pixel with alpha > 0, or `{x:0,y:0,w:0,h:0}` when none.
 *
 * The ground fills the mask and strokes add bleed, so this is the mask's bounds plus any
 * stroke that painted past it, clamped to the canvas. A whole-image painting gives the full
 * canvas.
 */
export function paintedBounds(pixels: Uint8ClampedArray, W: number, H: number): Rect {
  let minX = W,
    minY = H,
    maxX = -1,
    maxY = -1;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++)
      if (pixels[(y * W + x) * 4 + 3]! > 0) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
  if (maxX < 0) return { x: 0, y: 0, w: 0, h: 0 };
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}
