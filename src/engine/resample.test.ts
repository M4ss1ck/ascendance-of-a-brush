import { describe, expect, it } from "vitest";
import { workingSize } from "./resample.ts";

// The working-size formula is the prototype's (docs/reference/brush-bench.html lines 276-277):
// scale the longest side to `size`, round each side, floor each side at 16 px. `resample`
// itself reads canvas pixels, so it is covered by paint.browser.test.ts.
describe("workingSize", () => {
  it.each([
    ["landscape", 200, 100, 64, { W: 64, H: 32 }],
    ["portrait", 100, 200, 64, { W: 32, H: 64 }],
    ["square", 640, 640, 320, { W: 320, H: 320 }],
    ["downscale", 4000, 3000, 640, { W: 640, H: 480 }],
    ["upscale", 40, 30, 64, { W: 64, H: 48 }],
    ["rounds to nearest", 150, 100, 64, { W: 64, H: 43 }],
    ["16 px floor", 1000, 10, 64, { W: 64, H: 16 }],
  ])("%s", (_id, w, h, size, expected) => {
    expect(workingSize(w, h, size)).toStrictEqual(expected);
  });

  it("floors the longest side too when the image is tiny", () => {
    expect(workingSize(4, 2, 2)).toStrictEqual({ W: 16, H: 16 });
  });
});
