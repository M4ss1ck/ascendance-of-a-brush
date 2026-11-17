import { describe, expect, it } from "vitest";
import { analyze } from "../engine/analysis.ts";
import { paint, type PaintRequest } from "../engine/paint.ts";
import { toMask } from "../engine/selection.ts";
import { fnv1a } from "../testing/fnv1a.ts";
import { demoRequest } from "./demo.ts";

// Pins the empty-state demo on the main thread: the gold book request runs through the same
// analyze → toMask → paint path the worker uses, so a demo is a fixed picture per brush and
// seed (ADR-0003, ADR-0008).

/** One full run of a request; the request itself is pure, so it can be run twice. */
function run(request: PaintRequest): { hash: string; strokes: number } {
  const a = analyze(request.pixels, request.W, request.H, request.settings);
  const mask = request.selection ? toMask(request.selection, request.W, request.H) : null;
  const ctx = new OffscreenCanvas(request.W, request.H).getContext("2d", {
    willReadFrequently: true,
  })!;
  const plan = paint(ctx, a, request.settings, request.brush, mask);

  return {
    hash: fnv1a(ctx.getImageData(0, 0, request.W, request.H).data),
    strokes: plan.strokes.length,
  };
}

describe("demo book", () => {
  it.each([
    ["dab", 1, "21849f72"],
    ["curve", 2, "8f2a1236"],
  ] as const)("%s seed %i paints the same book twice", (brush, seed, hash) => {
    const request = demoRequest(brush, seed);
    const first = run(request);
    const second = run(request);

    expect(first.hash).toBe(second.hash);
    expect(first.strokes).toBeGreaterThan(500);
    expect(first.hash).toBe(hash);
  });
});
