# Coarse-to-fine layered planner (Hertzmann 1998)

The planner follows Hertzmann, "Painterly Rendering with Curved Brush Strokes of Multiple Sizes" (SIGGRAPH 1998):

- **Layers.** Brush radius R starts at `maxR` and halves each layer, never below 1.5 px.
- **Reference per layer.** The source blurred to Gaussian σ = R/2, approximated by three box-blur passes of radius `radiusForSigma(σ) = round((sqrt(1 + 4σ²) − 1) / 2)`, because three passes of radius r give σ = sqrt(r(r+1)).
- **Placement.** The grid cell size is `max(2, round(R))`. On the first layer every cell gets a stroke. On later layers a cell gets one only when its mean RGB distance between canvas and reference is above `threshold`. The stroke starts at the worst pixel in the cell plus seeded jitter of up to ±`jitter × cell / 2`, clamped to the image. Strokes are shuffled within the layer (seeded Fisher-Yates) before drawing.

## Considered Options

- **Blur radius R/2 directly.** This was a real bug in the prototype: three passes of radius R/2 give σ ≈ 2.4 for a 3 px brush instead of 1.5. It over-blurred the fine layers and erased small features (the lips test) before any paint went down.
