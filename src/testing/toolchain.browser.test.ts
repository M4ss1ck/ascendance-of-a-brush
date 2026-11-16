import { describe, expect, it } from "vitest";
import { fnv1a } from "./fnv1a.ts";
import { SCENE_H, SCENE_W, drawSmokeScene, hashableScene } from "./smoke-scene.ts";

// Preconditions for ADR-0003 (same-browser determinism) and ADR-0010 (worker rendering).
// These test the harness, not the engine: if they fail, no engine hash test can be trusted.

function hashInWorker(): Promise<string> {
  return new Promise((resolve, reject) => {
    const w = new Worker(new URL("./smoke.worker.ts", import.meta.url), { type: "module" });
    w.addEventListener("message", (e: MessageEvent<string>) => {
      w.terminate();
      resolve(e.data);
    });
    w.addEventListener("error", (e) => {
      w.terminate();
      reject(new Error(e.message));
    });
    w.postMessage(null);
  });
}

describe("browser lane", () => {
  it("renders the same scene to the same pixel hash twice", () => {
    expect(fnv1a(hashableScene())).toBe(fnv1a(hashableScene()));
  });

  it("produces the same pixels on a DOM canvas and an OffscreenCanvas", () => {
    const cv = document.createElement("canvas");
    cv.width = SCENE_W;
    cv.height = SCENE_H;
    const ctx = cv.getContext("2d", { willReadFrequently: true })!;
    drawSmokeScene(ctx);
    const dom = fnv1a(ctx.getImageData(0, 0, SCENE_W, SCENE_H).data);
    expect(dom).toBe(fnv1a(hashableScene()));
  });

  it("renders with OffscreenCanvas inside a module worker, matching the main thread", async () => {
    const [a, b] = await Promise.all([hashInWorker(), hashInWorker()]);
    expect(a).toBe(b);
    expect(a).toBe(fnv1a(hashableScene()));
  });

  it("is not a trivial hash (the scene actually drew)", () => {
    const blank = new Uint8ClampedArray(SCENE_W * SCENE_H * 4);
    expect(fnv1a(hashableScene())).not.toBe(fnv1a(blank));
  });
});
