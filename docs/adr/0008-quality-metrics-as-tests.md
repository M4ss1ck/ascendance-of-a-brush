# Quality metrics are tests

Three scores, lower is better, all mean RGB Euclidean distance between painting and source:

- **Error:** over all pixels, against the source blurred at r=1, so brush texture isn't punished.
- **Edge error:** on the top 15% of pixels by gradient magnitude (central differences on the r=1 blurred luminance).
- **Line error:** on pixels where a difference of Gaussians on the sharp luminance is above 12. The two blurs go through `radiusForSigma`, so "σ 0.8" is box radius 0 (no blur) and "σ 2.5" is box radius 2 (σ ≈ 2.45): in effect `|L − box3(L, r=2)| > 12`.

Edge and line error compare with the **sharp** source. Comparing them with the blurred source penalized sharpness, to the point that the unchanged source itself scored 26.5.

These scores ship as threshold tests on fixture images (ADR-0015), alongside the hash-stability tests (ADR-0003). They are not shown in the app: scores and the prototype's error-map overlay are development and test tools.
