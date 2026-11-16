/**
 * Colour helpers ported verbatim from docs/reference/brush-bench.html.
 *
 * Formulas and operation order are frozen to the prototype; do not "fix" them.
 */
export type RGB = [number, number, number];

/** Ported from `clamp` (line 173). */
export function clamp(v: number, a: number, b: number): number {
  return v < a ? a : v > b ? b : v;
}

/** Ported from `shade` (line 175). */
export function shade(c: RGB, f: number): RGB {
  return [c[0] * (1 + f), c[1] * (1 + f), c[2] * (1 + f)];
}

/** Ported from `rgb2hsv` (lines 178-184). Returns [h, s, v]. */
export function rgb2hsv(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const mx = Math.max(r, g, b),
    mn = Math.min(r, g, b),
    d = mx - mn;
  let h = 0;
  if (d) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [(h / 6 + 1) % 1, mx ? d / mx : 0, mx];
}

/** Ported from `hsv2rgb` (lines 185-189). Returns [r, g, b] in 0..255. */
export function hsv2rgb(h: number, s: number, v: number): RGB {
  const i = Math.floor(h * 6),
    f = h * 6 - i,
    p = v * (1 - s),
    q = v * (1 - f * s),
    t = v * (1 - (1 - f) * s);
  const rows: RGB[] = [
    [v, t, p],
    [q, v, p],
    [p, v, t],
    [p, q, v],
    [t, p, v],
    [v, p, q],
  ];
  const m = rows[i % 6]!;
  return [m[0] * 255, m[1] * 255, m[2] * 255];
}
