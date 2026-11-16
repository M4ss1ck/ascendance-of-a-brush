/**
 * A fixed scene that exercises the Canvas 2D features the brushes rely on:
 * alpha fills, arcs, round-capped quadratic curves at fractional widths.
 * Used only to check that the browser lane can hash pixels reproducibly.
 */
export const SCENE_W = 96;
export const SCENE_H = 64;

type Ctx2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

export function drawSmokeScene(ctx: Ctx2D): void {
  ctx.fillStyle = "rgb(120,96,70)";
  ctx.fillRect(0, 0, SCENE_W, SCENE_H);
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = "rgb(30,60,140)";
  ctx.beginPath();
  ctx.arc(30.3, 25.7, 13.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.globalAlpha = 0.54;
  ctx.strokeStyle = "rgb(230,180,60)";
  ctx.lineWidth = 7.3;
  ctx.beginPath();
  ctx.moveTo(8.5, 50.2);
  ctx.quadraticCurveTo(40.1, 10.9, 88.4, 44.6);
  ctx.stroke();
  ctx.globalAlpha = 0.71;
  ctx.lineWidth = 0.9;
  ctx.strokeStyle = "rgb(250,240,220)";
  ctx.beginPath();
  ctx.moveTo(10.2, 52.8);
  ctx.quadraticCurveTo(42.7, 13.3, 86.1, 47.9);
  ctx.stroke();
}

export function hashableScene(): Uint8ClampedArray {
  const cv = new OffscreenCanvas(SCENE_W, SCENE_H);
  const ctx = cv.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("2d context unavailable");
  drawSmokeScene(ctx);
  return ctx.getImageData(0, 0, SCENE_W, SCENE_H).data;
}
