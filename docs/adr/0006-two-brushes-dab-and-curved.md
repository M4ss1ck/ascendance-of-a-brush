# Two brushes: Dab and Curved (edge-aware)

The app offers exactly two brushes. The user approved both as final, so their behavior is ported exactly from `B.dab` and `B.curve` in `docs/reference/brush-bench.html`, including PRNG draw order (ADR-0003).

**Dab.** A filled circle with radius `R × (0.55 + 0.25·rng)`. Its color is the layer reference at the stroke position.

**Curved, edge-aware.**

- **Path.** Grows both ways from the start point along the tensor flow. Each step is 0.75R long, with up to `ceil(maxLen / 2)` steps each way, and each direction is blended 0.6 new / 0.4 previous.
- **Stopping.** It stops on any of:
  - tensor strength below 1;
  - leaving the image;
  - the reference color at the half step or full step, at the center or either flank (±0.45 × width), further than `tol` from the start color;
  - Hertzmann's rule: the canvas is already closer to the reference than the start color.
- **Color.** The mean reference color along the path.
- **Look.** Width 1.4R, drawn as a base stroke at 0.6 × opacity. On top go up to 12 bristle lines with seeded shade and opacity jitter, and each bristle has a 35% chance of dropping its last point. A single-point path draws as a circle of radius 0.45 × width.

**Shared color finishing.** Optional k-means++ palette snap, then a seeded HSV jitter scaled by `colorJitter`.
