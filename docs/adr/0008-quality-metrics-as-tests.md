# Quality metrics are tests

Three scores, lower is better, all mean RGB Euclidean distance between painting and source:

- **Error:** over all pixels, against the source blurred at r=1, so brush texture isn't punished.
- **Edge error:** on the top 15% of pixels by gradient magnitude (central differences on the r=1 blurred luminance).
- **Line error:** on pixels where the difference of Gaussians on luminance (σ 0.8 vs 2.5) is above 12.

Edge and line error compare with the **sharp** source. Comparing them with the blurred source penalized sharpness, to the point that the unchanged source itself scored 26.5.

These scores ship as threshold tests on fixture images (ADR-0015), alongside the hash-stability tests (ADR-0003). They are not shown in the app. The prototype's error-map overlay was a development tool.
