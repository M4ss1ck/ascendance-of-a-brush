/**
 * Settings in the URL query string (ADR-0016).
 *
 * Pure functions: `parseSettings` takes the query string the caller reads from
 * `location.search`, and `writeSettings` returns the query string the caller appends. No DOM
 * is touched, so the unit lane covers this module.
 *
 * Parameter names are the setting names from ADR-0013, written in its order. Ranges and
 * steps are the prototype's (docs/reference/brush-bench.html, lines 629-638). Only values
 * that differ from the defaults are written, so the default painting has a bare URL.
 */

import type { BrushName } from "../engine/brushes.ts";
import type { PaintSettings } from "../engine/paint.ts";

export interface Settings extends PaintSettings {
  brush: BrushName;
  size: number;
}

/** ADR-0013 lines 7-21. */
export const DEFAULTS: Settings = {
  brush: "curve",
  seed: 7,
  size: 640,
  maxR: 24,
  layers: 4,
  threshold: 24,
  tol: 30,
  maxLen: 8,
  jitter: 0.6,
  colorJitter: 0.06,
  palette: 0,
  opacity: 0.9,
  ground: "toned",
};

/** ADR-0016 line 3 order. */
const PARAMS = [
  "brush",
  "seed",
  "size",
  "maxR",
  "layers",
  "threshold",
  "tol",
  "maxLen",
  "jitter",
  "colorJitter",
  "palette",
  "opacity",
  "ground",
] as const;

const SIZES = new Set([480, 640, 960, 1280]);

/** `raw` as a finite number, or null when missing, empty or not numeric. */
const toNumber = (raw: string | null): number | null => {
  if (raw === null || raw.trim() === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
};

/**
 * `raw` as a number within `min`..`max` and on `step` from `min`, or null otherwise. The
 * step test allows a loose epsilon so float error from the 0.05 and 0.01 steps passes.
 */
const toStepped = (raw: string | null, min: number, max: number, step: number): number | null => {
  const n = toNumber(raw);
  if (n === null || n < min || n > max) return null;
  const k = (n - min) / step;
  return Math.abs(k - Math.round(k)) < 1e-6 ? n : null;
};

/**
 * Reads settings from a query string (with or without the leading `?`).
 *
 * A missing, unknown, non-numeric, non-finite, out-of-range or off-step value falls back to
 * its default; unknown parameters are ignored. A bad link never stops the app.
 */
export function parseSettings(query: string): Settings {
  const params = new URLSearchParams(query);
  const s: Settings = { ...DEFAULTS };

  const brush = params.get("brush");
  if (brush === "dab" || brush === "curve") s.brush = brush;

  const seed = toNumber(params.get("seed"));
  if (seed !== null && Number.isSafeInteger(seed)) s.seed = seed;

  const size = toNumber(params.get("size"));
  if (size !== null && SIZES.has(size)) s.size = size;

  const ground = params.get("ground");
  if (ground === "white" || ground === "toned" || ground === "blurred") s.ground = ground;

  s.maxR = toStepped(params.get("maxR"), 6, 48, 2) ?? DEFAULTS.maxR;
  s.layers = toStepped(params.get("layers"), 1, 5, 1) ?? DEFAULTS.layers;
  s.threshold = toStepped(params.get("threshold"), 0, 80, 1) ?? DEFAULTS.threshold;
  s.tol = toStepped(params.get("tol"), 5, 120, 1) ?? DEFAULTS.tol;
  s.maxLen = toStepped(params.get("maxLen"), 1, 16, 1) ?? DEFAULTS.maxLen;
  s.jitter = toStepped(params.get("jitter"), 0, 1, 0.05) ?? DEFAULTS.jitter;
  s.colorJitter = toStepped(params.get("colorJitter"), 0, 0.3, 0.01) ?? DEFAULTS.colorJitter;
  s.palette = toStepped(params.get("palette"), 0, 24, 2) ?? DEFAULTS.palette;
  s.opacity = toStepped(params.get("opacity"), 0.3, 1, 0.05) ?? DEFAULTS.opacity;

  return s;
}

/** Writes the non-default settings as a query string without the leading `?`. */
export function writeSettings(s: Settings): string {
  const params = new URLSearchParams();
  for (const k of PARAMS) if (s[k] !== DEFAULTS[k]) params.set(k, String(s[k]));
  return params.toString();
}
