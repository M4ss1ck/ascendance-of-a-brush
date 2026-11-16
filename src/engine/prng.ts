export type Rng = () => number;

export function sfc32(a: number, b: number, c: number, d: number): Rng {
  return function () {
    a |= 0;
    b |= 0;
    c |= 0;
    d |= 0;
    const t = (((a + b) | 0) + d) | 0;
    d = (d + 1) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  };
}

export function rngFrom(seed: number, salt = 0): Rng {
  const r = sfc32(0x9e3779b9, seed | 0, salt | 0, 0x85ebca6b ^ (seed | 0));
  for (let i = 0; i < 15; i++) r();
  return r;
}

export const seedOf = (rng: Rng): number => (rng() * 4294967296) >>> 0;
