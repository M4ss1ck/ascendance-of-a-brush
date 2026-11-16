# Determinism contract: seeded, per-stroke seeds, same browser only

The same source, settings and seed must give the same painting, pixel for pixel, and repainting from the stored stroke list alone must give the same pixels again. We get there with:

- One PRNG, `sfc32`, seeded through `rngFrom(seed, salt)` (15 warm-up draws). `Math.random` is banned and oxlint rejects it.
- Fixed salts per consumer: layer `li` uses salt `li * 1009 + 1`, the palette uses salt `777`, drawing a stroke uses `rngFrom(stroke.seed)` (salt 0), and the prototype's sample scene uses `rngFrom(42, 9)`.
- Every stroke whose drawing is random stores its own `seed` (Curved: bristle offsets, shade and opacity jitter), so drawing it needs no shared PRNG state. A Dab stroke draws deterministically and has no seed; its planning draws none.
- A fixed working resolution per run (ADR-0011).

Identity is checked with a 32-bit FNV-1a hash of `ImageData.data`. The prototype verified both identities (paint twice, replay from the stroke list).

**Scope is the same browser engine only.** Canvas 2D antialiasing and `drawImage` resampling differ between engines, so hashes are only compared within one engine (Chromium in tests). Bit-identical output across browsers would need a custom rasterizer; nobody has asked for that.

## Consequences

The order of PRNG draws is part of the contract. The prototype's grid draws two jitter values for every cell, even cells that get no stroke. A Dab's `make` draws 1 (radius) plus 3 when `colorJitter > 0`; a Curved `make` draws 3 when `colorJitter > 0`, plus 1 for its seed. A port that adds or skips a draw changes every painting.

Golden hashes from the port alone would freeze its mistakes, so the port is also checked against the prototype itself: a browser test loads `docs/reference/brush-bench.html` in the same Chromium, paints the same input with the same settings, and compares hashes (issue #4). The prototype draws on canvases created with `willReadFrequently: true`; the port's canvases use the same option.
