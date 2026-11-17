import { describe, expect, it } from "vitest";
import { DEMO_H, DEMO_W, bookOutline, cyclePhase, demoCycle } from "./demo.ts";

// The unit lane covers the schedule and the mask outline only: drawBook and demoRequest
// need an OffscreenCanvas, so the painted demo is pinned in demo.browser.test.ts.

describe("demoCycle", () => {
  it("alternates the brush and steps the seed", () => {
    expect(demoCycle(0)).toEqual({ brush: "dab", seed: 1 });
    expect(demoCycle(1)).toEqual({ brush: "curve", seed: 2 });
    expect(demoCycle(2)).toEqual({ brush: "dab", seed: 3 });
    expect(demoCycle(3)).toEqual({ brush: "curve", seed: 4 });
  });
});

describe("cyclePhase", () => {
  it.each([
    [-1, "paint", 0],
    [0, "paint", 0],
    [3000, "paint", 0.75],
    [6000, "hold", 1],
    [7999, "hold", 1],
    [8000, "fade", 0],
    [8500, "fade", 0.5],
    [9000, "done", 1],
  ] as const)("%i ms is %s with k %d", (t, phase, k) => {
    const p = cyclePhase(t);

    expect(p.phase).toBe(phase);
    expect(p.k).toBeCloseTo(k);
  });
});

describe("bookOutline", () => {
  const pts = bookOutline();

  it("opens on the spine top", () => {
    expect(pts[0]).toEqual([240, 95]);
  });

  it("traces both pages without repeating the closing point", () => {
    // 16 samples per curve (4 curves), less the closing repeat on the spine top, plus the
    // two straight page edges and the spine top itself.
    expect(pts).toHaveLength(64 - 1 + 2 + 1);
    expect(pts).toContainEqual([35, 290]);
    expect(pts).toContainEqual([445, 80]);
    expect(pts.at(-1)).not.toEqual(pts[0]);
  });

  it("stays inside the demo canvas", () => {
    for (const [x, y] of pts) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(DEMO_W);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(DEMO_H);
    }
  });
});
