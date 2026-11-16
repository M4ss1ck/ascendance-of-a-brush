# Planning and rendering run in a Web Worker

Analysis, planning and rendering run in a dedicated module Worker that draws on an `OffscreenCanvas`. In the prototype, four 640 px panels took 0.1 to 3 s on the main thread, and larger working sizes (ADR-0011) make that worse. The main thread handles UI, selection input and display.

Because the planner reads the canvas between layers (ADR-0002), planner and renderer live in the same worker and share one raster. Golden hashes are taken from the worker's raster. The bootstrap smoke test (`src/testing/toolchain.browser.test.ts`) shows that in Chromium, a scene drawn on an OffscreenCanvas in a worker hashes the same as on the main thread.

## Consequences

Messages carry plain data (settings, mask, stroke lists, ImageBitmaps or transferred buffers), never DOM objects. That fits the stroke-list contract.
