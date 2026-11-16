# Settings live in the URL query string

Brush, seed and every Advanced setting (ADR-0013) are written to the page's query string, so a link plus the same source image reproduces the same painting. The parameter names are the setting names from ADR-0013: `brush`, `seed`, `size`, `maxR`, `layers`, `threshold`, `tol`, `maxLen`, `jitter`, `colorJitter`, `palette`, `opacity`, `ground`.

- Only values that differ from their defaults are written, so the default painting has a bare URL.
- On load, a missing, unknown or out-of-range value falls back to its default. A bad link never stops the app.
- The source image is never in the URL. It stays in the browser (ADR-0001).

## Considered Options

- **Short names** (`b`, `s`, `r`, ...). Rejected: only non-default values are written, so links are short anyway, and the setting names match the code and ADR-0013.
- **`localStorage` only.** Rejected: settings could not be shared.

## Consequences

Renaming a setting, changing a default, or narrowing a range changes what old links paint, so it needs a new ADR and a migration of the old parameter. Seeds stay deterministic only within one browser engine (ADR-0003), so a shared link can paint differently in another browser.
