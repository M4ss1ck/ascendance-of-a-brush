# v1 exports: PNG, WebM timelapse, SVG

- **PNG:** the rendered raster at working-size scale (1:1), cropped and transparent outside the mask per ADR-0009.
- **WebM timelapse:** the stroke list replayed in plan order and encoded in the browser.
- **SVG:** the stroke list as vector paths (circles for dabs, base path plus bristle paths for curves, regenerated from each stroke's seed). It is a vector approximation: antialiasing and compositing differ from the canvas, so SVG output is never hash-compared.

A stroke-list JSON export was offered and not chosen for v1. The stroke list stays internal (replay, timelapse, SVG).

## Consequences

The timelapse encoding path is settled in ADR-0019: WebCodecs `VideoEncoder` (VP9) muxed by Mediabunny, in a dedicated worker.
