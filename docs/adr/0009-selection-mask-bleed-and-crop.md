# Selections are masks: strokes start inside, bleed out, output is cropped

Users choose what gets painted. The selection modes are:

- **Whole image**
- **Shapes:** rectangle, ellipse, polygon
- **Pencil:** a closed freehand outline

Every selection becomes a **mask**. The planner only places strokes whose start point is inside the mask. Strokes are **not clipped**: they may bleed past the outline, because that looks more painterly than a hard edge.

For any selection other than the whole image:

- The ground is laid only inside the mask.
- Everything outside the mask stays transparent, except where bleeding strokes paint over it.
- The output is cropped to the bounding rectangle of everything painted: the mask's bounds plus any stroke that bled past them, clamped to the working canvas.

## Considered Options

- **Clip at the mask edge.** Rejected for its hard, cut-out look.
- **Paint over the untouched photo outside the mask.** Rejected in favor of a standalone, transparent painted object.
