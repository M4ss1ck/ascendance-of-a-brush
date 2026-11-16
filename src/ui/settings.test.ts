import { describe, expect, it } from "vitest";
import { anotherSeed, DEFAULTS, parseSettings, writeSettings, type Settings } from "./settings.ts";

describe("writeSettings", () => {
  it("writes nothing for the defaults", () => {
    expect(writeSettings(DEFAULTS)).toBe("");
  });

  it("writes only non-default values, in ADR order", () => {
    expect(writeSettings({ ...DEFAULTS, ground: "white", brush: "dab" })).toBe(
      "brush=dab&ground=white",
    );
  });
});

describe("parseSettings", () => {
  it("returns the defaults for an empty query", () => {
    expect(parseSettings("")).toEqual(DEFAULTS);
    expect(parseSettings("?")).toEqual(DEFAULTS);
  });

  it("ignores unknown parameters", () => {
    expect(parseSettings("?nope=1&errMap=true")).toEqual(DEFAULTS);
  });

  it("round-trips a non-default Settings", () => {
    const s: Settings = {
      brush: "dab",
      seed: 42,
      size: 1280,
      maxR: 6,
      layers: 5,
      threshold: 0,
      tol: 120,
      maxLen: 16,
      jitter: 0,
      colorJitter: 0.3,
      palette: 24,
      opacity: 0.3,
      ground: "blurred",
    };
    const q = writeSettings(s);
    expect(q).toBe(
      "brush=dab&seed=42&size=1280&maxR=6&layers=5&threshold=0&tol=120" +
        "&maxLen=16&jitter=0&colorJitter=0.3&palette=24&opacity=0.3&ground=blurred",
    );
    expect(parseSettings(q)).toEqual(s);
    expect(parseSettings(`?${q}`)).toEqual(s);
  });

  it("accepts values that sit on a 0.05 or 0.01 step", () => {
    expect(parseSettings("?jitter=0.15").jitter).toBe(0.15);
    expect(parseSettings("?colorJitter=0.07").colorJitter).toBe(0.07);
    expect(parseSettings("?opacity=0.35").opacity).toBe(0.35);
  });

  it("accepts any safe integer seed", () => {
    expect(parseSettings("?seed=0").seed).toBe(0);
    expect(parseSettings("?seed=-123").seed).toBe(-123);
    expect(parseSettings("?seed=9007199254740991").seed).toBe(9007199254740991);
  });

  it.each([
    ["brush=pastel", "tol", 40],
    ["seed=1.5", "tol", 40],
    ["seed=9007199254740992", "tol", 40],
    ["size=800", "tol", 40],
    ["size=abc", "tol", 40],
    ["maxR=7", "layers", 2],
    ["maxR=50", "layers", 2],
    ["maxR=Infinity", "layers", 2],
    ["maxR=", "layers", 2],
    ["layers=0", "tol", 40],
    ["layers=6", "tol", 40],
    ["threshold=81", "layers", 2],
    ["tol=4", "layers", 2],
    ["maxLen=17", "layers", 2],
    ["jitter=0.62", "layers", 2],
    ["colorJitter=0.31", "layers", 2],
    ["palette=3", "layers", 2],
    ["opacity=0.32", "layers", 2],
    ["ground=canvas", "layers", 2],
  ] as const)("falls back to the default for %s", (bad, key, value) => {
    const s = parseSettings(`?${bad}&${key}=${value}`);
    expect(s[key]).toBe(value);
    expect({ ...s, [key]: DEFAULTS[key] }).toEqual(DEFAULTS);
  });
});

describe("anotherSeed", () => {
  it("adds 1", () => {
    expect(anotherSeed(7)).toBe(8);
  });

  it("never writes a seed the URL parser refuses", () => {
    const seed = anotherSeed(Number.MAX_SAFE_INTEGER);
    expect(parseSettings(writeSettings({ ...DEFAULTS, seed })).seed).toBe(seed);
  });
});
