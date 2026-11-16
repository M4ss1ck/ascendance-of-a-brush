# Rejected brushes and passes

These were built and compared in the prototype and turned down. Don't reintroduce them without asking.

- **Flat bristle brush and watercolor splat.** Explored in round 1 and dropped by the user.
- **Round-1 curved stroke** (Hertzmann as written, color taken at the start point). It smeared detail across edges. On the city test photo, the edge-aware version cut edge error from 27.9 to 19.5 (old metric).
- **Hybrid** (curves for big brushes, dabs for fine ones). It never beat edge-aware curves.
- **Liner pass** (thin strokes along lines found by a difference of Gaussians). It cut line error by 60 to 75% and saved the lips, but the user dropped it.

## Consequences

Small features such as the lips in the anime test frame are lost at 640 px working size. The levers that remain are a larger working size (ADR-0011) or a fifth layer (1.5 px brush).
