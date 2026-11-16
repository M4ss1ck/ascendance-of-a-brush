import { describe, expect, it } from "vitest";
import { tw } from "./tw.ts";

describe("tw", () => {
  it("returns the class string unchanged", () => {
    expect(tw`flex p-4`).toBe("flex p-4");
  });

  it("interpolates values in place", () => {
    const size = "text-sm";
    expect(tw`flex ${size} p-4`).toBe("flex text-sm p-4");
  });
});
