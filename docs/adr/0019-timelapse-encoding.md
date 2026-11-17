# The timelapse is encoded with WebCodecs and Mediabunny in its own worker

The timelapse export replays the plan in a dedicated, short-lived worker and encodes it with the WebCodecs `VideoEncoder` (VP9), muxed to WebM by `mediabunny`. The worker gets a copy of the plan, renders each frame on an `OffscreenCanvas`, and is terminated when the file is done or the export is cancelled. Anything that replaces the painting (a new image, a brush, seed or Advanced change) cancels an encode in progress and discards it.

The video has a fixed length whatever the stroke count: 30 fps, a first frame with the ground alone, the strokes spread over 8 s with the demo's easing (ADR-0018) so the coarse layers land first, then a 2 s hold on the finished painting. That makes 300 frames. Frames are cropped like the PNG export (ADR-0012). The area outside a non-rectangular mask is filled with the white ground `#f6f4ef` instead of VP9 alpha, which most players and sites drop. An odd width or height is padded by one pixel of the same color, since 4:2:0 needs even sizes. The bitrate is about 0.1 bits per pixel per frame.

When `VideoEncoder.isConfigSupported` rejects VP9 at the frame size, the Timelapse export is shown disabled with the reason "This browser can't encode video". There is no fallback.

Encoded bytes are not hash-compared, because VP9 output may differ between encoder builds. Tests decode the file and check its frame count and size, compare the last frame to the PNG raster and the first frame to the ground, each within a small error.

## Considered Options

- **`MediaRecorder` on a captured canvas.** Rejected: it records in real time on the main thread, its frame timing depends on the machine, and its output cannot be tested frame by frame. It would also need the raster on the main thread, while the renderer lives in a worker (ADR-0010).
- **A new message on the paint worker.** Rejected: a repaint would queue behind a running encode, and cancelling would need cooperative checks instead of `terminate()`.
- **`webm-muxer`.** Rejected: deprecated by its author in favor of Mediabunny.
- **A fixed number of strokes per frame.** Rejected: a Dab painting has several times the strokes of a Curved one, so video length would swing with the brush.
- **A MediaRecorder fallback for browsers without VP9 encoding.** Rejected: a second encoding path to keep working and test, for a shrinking set of browsers.

## Consequences

`mediabunny` is the app's first runtime dependency beyond fonts.
