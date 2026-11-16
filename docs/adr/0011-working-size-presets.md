# Working size is a preset, and export is 1:1

The source is resampled to a working size chosen from fixed presets (long side 480, 640, 960 or 1280 px; default 640, as in the prototype). Planning, rendering and export all happen at that size, so every preset is deterministic on its own terms (ADR-0003). Bigger presets keep smaller features (ADR-0007) at a time cost.

## Considered Options

- **Plan at 640 and re-render the stroke list scaled up.** Rejected because the scaled output would be a different raster with its own hashes, and there would be two notions of "the painting".

## Consequences

The same seed gives a different painting at each preset, because placement is per-pixel. Brush radii are absolute pixels (`maxR` = 24 at every preset), as in the prototype, so a larger preset gives relatively finer brushwork. Adding a preset above 1280 needs a performance check first.
