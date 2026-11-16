# Settings: brush and seed up front, everything else in Advanced

Visible by default: **brush** (Dab or Curved) and **seed**. Every other knob sits in a collapsed **Advanced** section: working size, largest brush (`maxR`), layers, error threshold, color tolerance, curve length (`maxLen`), grid jitter, color jitter, palette size, paint opacity and ground.

Defaults are the values the user approved in the prototype:

| setting       | default | prototype range                     |
| ------------- | ------- | ----------------------------------- |
| working size  | 640     | 480 / 640 / 960 / 1280              |
| `maxR`        | 24      | 6 to 48, step 2                     |
| layers        | 4       | 1 to 5                              |
| threshold     | 24      | 0 to 80                             |
| `tol`         | 30      | 5 to 120                            |
| `maxLen`      | 8       | 1 to 16                             |
| jitter        | 0.6     | 0 to 1                              |
| `colorJitter` | 0.06    | 0 to 0.3                            |
| palette       | 0 (off) | 0 to 24, step 2                     |
| opacity       | 0.9     | 0.3 to 1                            |
| ground        | toned   | white, toned, blurred underpainting |

The grounds:

- **White:** `#f6f4ef`.
- **Toned:** the source's mean color × 0.45 + umber (120, 76, 46) × 0.55.
- **Blurred underpainting:** the source blurred to σ = 0.75 × `maxR`.
