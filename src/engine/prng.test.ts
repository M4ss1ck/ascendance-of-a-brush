import { describe, expect, it } from "vitest";
import { rngFrom, seedOf } from "./prng.ts";

const first8 = (seed: number, salt: number) => {
  const rng = rngFrom(seed, salt);
  return Array.from({ length: 8 }, () => rng());
};

describe("prng", () => {
  // Reference draws captured from docs/reference/brush-bench.html (sfc32, 15 warm-up draws).
  const vectors: Array<[seed: number, salt: number, expected: number[]]> = [
    [
      7,
      0,
      [
        0.5543122328817844, 0.6588737778365612, 0.7961692376993597, 0.8284961755853146,
        0.4723119211848825, 0.8343018968589604, 0.9440927568357438, 0.8906761766411364,
      ],
    ],
    [
      7,
      1,
      [
        0.6354335569776595, 0.8147689050529152, 0.16784576489590108, 0.8282176125794649,
        0.05876012705266476, 0.25798178068362176, 0.6735547599382699, 0.12563362484797835,
      ],
    ],
    [
      0,
      777,
      [
        0.9834229270927608, 0.3268927710596472, 0.26943345088511705, 0.2369171914178878,
        0.03769244998693466, 0.38210502127185464, 0.45608975389041007, 0.016407907009124756,
      ],
    ],
  ];

  it.each(vectors)("rngFrom(%i, %i) reproduces the prototype draws", (seed, salt, expected) => {
    const actual = first8(seed, salt);
    expect(actual).toHaveLength(expected.length);
    actual.forEach((value, i) => expect(value).toBe(expected[i]));
  });

  it("defaults the salt to 0", () => {
    const withDefault = rngFrom(7);
    const explicit = rngFrom(7, 0);
    const a = Array.from({ length: 8 }, () => withDefault());
    const b = Array.from({ length: 8 }, () => explicit());
    expect(a).toEqual(b);
  });

  it("seedOf returns an integer in [0, 2^32)", () => {
    for (const seed of [0, 1, 7, 12345, 0xffffffff]) {
      const value = seedOf(rngFrom(seed));
      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(2 ** 32);
    }
  });
});
