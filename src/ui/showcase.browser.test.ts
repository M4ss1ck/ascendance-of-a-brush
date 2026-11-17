import { describe, expect, it, vi } from "vitest";
import type { BrushName } from "../engine/brushes.ts";
import { startShowcase } from "./showcase.ts";

// Pins the empty-state showcase: its worker answers with the demo's first cycle (Dab) and the
// canvas takes the demo size, and stopping is idempotent and clears the brush (ADR-0018).

describe("showcase", () => {
  it("starts on the dab cycle and stops", async () => {
    const canvas = document.createElement("canvas");
    const brushes: (BrushName | null)[] = [];
    const showcase = startShowcase(canvas, (brush) => {
      brushes.push(brush);
    });

    await vi.waitFor(() => expect(brushes[0]).toBe("dab"), { timeout: 15000 });
    expect(canvas.width).toBe(480);
    expect(canvas.height).toBe(360);

    showcase.stop();
    expect(brushes.at(-1)).toBe(null);
    expect(() => showcase.stop()).not.toThrow();
  }, 20000);
});
