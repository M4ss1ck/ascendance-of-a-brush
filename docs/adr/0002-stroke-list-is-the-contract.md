# The stroke list is the contract between planning and rendering

The pipeline is source → analysis (blur pyramid, structure tensor, optional palette) → planner → stroke list → renderer. A stroke is plain, serializable data (position or path, radius or width, color, opacity, its own seed); the renderer turns a stroke list into pixels and knows nothing about how it was planned. The stroke list is what makes replay, timelapse, SVG export and hash tests possible, so it is the one interface every module agrees on.

## Consequences

- Planning is not independent of rasterizing. Each layer reads the canvas as painted by the earlier layers: placement compares that canvas to the layer's reference, and the curved brush's last stop rule compares canvas to reference along its path. So the planner drives the renderer layer by layer, and both must use the same raster (see ADR-0010). Replaying a stored stroke list needs only the renderer.
- Changing the shape of a stroke is a contract change: it touches planner, renderer, SVG export and every golden hash.
