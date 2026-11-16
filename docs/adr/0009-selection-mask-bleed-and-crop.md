# Selections are masks: strokes start inside, bleed out, the painting is cropped

Users choose what gets painted. The selection modes are:

- **Whole image**
- **Shapes:** rectangle, ellipse, polygon
- **Pencil:** a closed freehand outline

Every selection becomes a **mask**. The planner only places strokes whose start point is inside the mask. Strokes are **not clipped**: they may bleed past the outline, because that looks more painterly than a hard edge.

For any selection other than the whole image:

- The ground is laid only inside the mask.
- Everything outside the mask stays transparent, except where bleeding strokes paint over it.
- The painting is cropped to the bounding rectangle of everything painted: the mask's bounds plus any stroke that bled past them, clamped to the working canvas.

Planner rules for a masked painting, where the canvas has transparent pixels the prototype never saw:

1. A cell's error is averaged over the cell's mask pixels only. A cell with no mask pixels gets no stroke.
2. Every cell still draws its two jitter values, masked or not, so PRNG draw order (ADR-0003) does not depend on the mask.
3. The inside-the-mask test applies to the jittered, clamped start point.
4. The curved brush's Hertzmann stop treats a transparent canvas pixel as never closer to the reference than the stroke.
5. A whole-image selection reproduces the prototype exactly, hash for hash.

## Considered Options

- **Clip at the mask edge.** Rejected for its hard, cut-out look.
- **Paint over the untouched photo outside the mask.** Rejected in favor of a standalone, transparent painted object.
