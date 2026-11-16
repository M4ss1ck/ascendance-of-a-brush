import { describe, expect, it } from "vitest";
import { fnv1a } from "./fnv1a.ts";

const ascii = (s: string) => new TextEncoder().encode(s);

describe("fnv1a", () => {
  // Reference vectors from the FNV spec (draft-eastlake-fnv), 32-bit FNV-1a.
  it.each([
    ["", "811c9dc5"],
    ["a", "e40c292c"],
    ["foobar", "bf9cf968"],
  ])("hashes %j to %s", (input, expected) => {
    expect(fnv1a(ascii(input))).toBe(expected);
  });

  it("hashes clamped pixel buffers byte by byte", () => {
    const px = new Uint8ClampedArray([0x61]);
    expect(fnv1a(px)).toBe("e40c292c");
  });

  it("is sensitive to a single byte change", () => {
    const a = new Uint8Array(1024);
    const b = a.slice();
    b[512] = 1;
    expect(fnv1a(a)).not.toBe(fnv1a(b));
  });
});
