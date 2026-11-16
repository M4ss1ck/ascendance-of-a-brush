# Determinism contract: seeded, per-stroke seeds, same browser only

The same source, settings and seed must give the same painting, pixel for pixel, and repainting from the stored stroke list alone must give the same pixels again. We get there with:

- One PRNG, `sfc32`, seeded through `rngFrom(seed, salt)` (16 warm-up draws). `Math.random` is banned and oxlint rejects it.
- Fixed salts per consumer: layer `li` uses salt `li * 1009 + 1`, the palette uses salt `777`.
- Every stroke stores its own `seed`, so drawing it (bristle offsets, shade and opacity jitter) needs no shared PRNG state.
- A fixed working resolution per run (ADR-0011).

Identity is checked with a 32-bit FNV-1a hash of `ImageData.data`. The prototype verified both identities (paint twice, replay from the stroke list).

**Scope is the same browser engine only.** Canvas 2D antialiasing and `drawImage` resampling differ between engines, so hashes are only compared within one engine (Chromium in tests). Bit-identical output across browsers would need a custom rasterizer; nobody has asked for that.

## Consequences

The order of PRNG draws is part of the contract. The prototype's grid draws jitter for every cell, even cells that get no stroke, and each brush's `make` consumes a fixed number of draws. A port that skips a draw changes every painting.
