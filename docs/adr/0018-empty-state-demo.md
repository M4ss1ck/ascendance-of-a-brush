# The empty wall shows the brushes painting a gilt book

With no image loaded, the frame shows a looping demo instead of sitting hidden. The subject is an open book drawn in code, in gold shades on a bronze fill, and painted by the real planner through the existing `paint` request with a polygon selection around the book (ADR-0009). Only gold strokes are kept; the wall blue is the canvas fill and shows around and between them.

Each cycle paints one brush, alternating Dab and Curved, with the seed stepping 1, 2, 3, … so every cycle differs and the run is reproducible. A cycle replays its stroke list in paint order over 6 s (eased, so the coarse layers land first), holds 2 s and dissolves to the wall over 1 s. The matching brush pick glints while its cycle plays. With `prefers-reduced-motion` the frame shows one finished Curved painting and nothing moves. Clicking the frame opens the file picker. Loading an image stops the demo and terminates its worker.

## Considered Options

- **A hand-drawn abstract stroke field** like the brush picks. Rejected: it would not show what the planner does with a real subject.
- **A shipped stroke list.** Rejected: it is an asset to regenerate whenever the engine changes, and planning live costs about 100 ms per cycle in the worker.
- **Sun over dunes, spiral, flame.** Compared side by side; the book fits the theme and reads clearly with both brushes.
- **Rotating subjects.** Rejected: the changing seed already varies each cycle.
