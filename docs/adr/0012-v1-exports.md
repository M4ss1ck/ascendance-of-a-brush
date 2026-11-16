# v1 exports: PNG, WebM timelapse, SVG

- **PNG:** the rendered raster at working size. Transparent outside the mask for non-rectangular selections (ADR-0009).
- **WebM timelapse:** the stroke list replayed in plan order and encoded in the browser.
- **SVG:** the stroke list as vector paths (circles for dabs, base path plus bristle paths for curves, regenerated from each stroke's seed). It is a vector approximation: antialiasing and compositing differ from the canvas, so SVG output is never hash-compared.

A stroke-list JSON export was offered and not chosen for v1. The stroke list stays internal (replay, timelapse, SVG).

## Consequences

The timelapse encoding path (MediaRecorder on a captured canvas vs WebCodecs `VideoEncoder` plus a WebM muxer in the worker) is still open and gets decided in its own issue. The worker-side raster (ADR-0010) favors WebCodecs.
