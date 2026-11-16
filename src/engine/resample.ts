/**
 * Resampling an uploaded image to the working size, ported from
 * docs/reference/brush-bench.html lines 276-282.
 *
 * The prototype drew on a main-thread `<canvas>`; the worker draws on an `OffscreenCanvas`
 * instead (ADR-0010). A browser test in paint.browser.test.ts keeps both paths
 * hash-identical, so the smooth-scaling rule is the prototype's, not an approximation.
 */

/** Ported from lines 276-277: the longest side becomes `size`, each side is at least 16 px. */
export function workingSize(w: number, h: number, size: number): { W: number; H: number } {
  const sc = size / Math.max(w, h);
  return { W: Math.max(16, Math.round(w * sc)), H: Math.max(16, Math.round(h * sc)) };
}

/** Ported from line 280: high-quality smoothing, then read the RGBA raster back. */
export function resample(
  src: ImageBitmap,
  size: number,
): { pixels: Uint8ClampedArray; W: number; H: number } {
  const { W, H } = workingSize(src.width, src.height, size);
  const ctx = new OffscreenCanvas(W, H).getContext("2d", { willReadFrequently: true })!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(src, 0, 0, W, H);
  return { pixels: ctx.getImageData(0, 0, W, H).data, W, H };
}
