/**
 * The compare wipe (issue #6): the uploaded source over the painting, split by a vertical
 * gold handle. Left of the handle is the source, right of it the painting. Pressing anywhere
 * on the painting moves the split there and drags it; the arrow keys and Home/End do the same
 * when the handle has focus. It starts hidden at 0, so a fresh painting is shown in full.
 * Rewritten from the prototype's variant D (`vd-wipe`).
 */

/** One keyboard or button press moves the split this far. */
const STEP = 0.05;

export interface Wipe {
  /** Overlay to mount on the painting's box; it clips to that box. */
  element: HTMLDivElement;
  /** Draws `source` scaled to the painting's working size and shows the overlay. */
  show(source: ImageBitmap): void;
  /** Hides the overlay and parks the split at 0. */
  reset(): void;
}

export function createWipe(painting: HTMLCanvasElement): Wipe {
  const element = document.createElement("div");
  element.className = "wipe";
  element.hidden = true;

  const source = document.createElement("canvas");
  source.className = "wipe-source";
  source.setAttribute("aria-hidden", "true");

  // Full-area layer: the gold hairline is drawn inside it, at the split.
  const handle = document.createElement("div");
  handle.className = "wipe-handle";
  handle.setAttribute("role", "slider");
  handle.setAttribute("tabindex", "0");
  handle.setAttribute("aria-label", "Compare with the source");
  handle.setAttribute("aria-valuemin", "0");
  handle.setAttribute("aria-valuemax", "100");
  handle.setAttribute("aria-valuenow", "0");

  const sourceLabel = document.createElement("span");
  sourceLabel.className = "wipe-label left";
  sourceLabel.textContent = "source";
  const paintingLabel = document.createElement("span");
  paintingLabel.className = "wipe-label right";
  paintingLabel.textContent = "painting";
  handle.append(sourceLabel, paintingLabel);

  element.append(source, handle);

  let cut = 0;

  /** `next` is a fraction of the painting's width from its left edge. */
  function setCut(next: number): void {
    cut = Math.min(1, Math.max(0, next));
    source.style.clipPath = `inset(0 ${100 - cut * 100}% 0 0)`;
    handle.style.setProperty("--cut", `${cut * 100}%`);
    handle.setAttribute("aria-valuenow", String(Math.round(cut * 100)));
    handle.setAttribute("aria-valuetext", `${Math.round(cut * 100)}% source`);
  }
  setCut(0);

  let dragging = false;

  /** Moves the split to the pointer's column within the painting. */
  function cutAt(clientX: number): void {
    const rect = painting.getBoundingClientRect();
    if (rect.width) setCut((clientX - rect.left) / rect.width);
  }

  // The handle spans the painting, so a press anywhere on it takes the split and drags.
  handle.addEventListener("pointerdown", (event) => {
    dragging = true;
    handle.setPointerCapture(event.pointerId);
    handle.focus();
    cutAt(event.clientX);
  });
  handle.addEventListener("pointermove", (event) => {
    if (!dragging) return;
    cutAt(event.clientX);
  });
  for (const end of ["pointerup", "pointercancel", "lostpointercapture"]) {
    handle.addEventListener(end, () => {
      dragging = false;
    });
  }
  handle.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") setCut(cut - STEP);
    else if (event.key === "ArrowRight") setCut(cut + STEP);
    else if (event.key === "Home") setCut(0);
    else if (event.key === "End") setCut(1);
    else return;
    event.preventDefault();
  });

  function show(bitmap: ImageBitmap): void {
    source.width = painting.width;
    source.height = painting.height;
    const ctx = source.getContext("2d");
    if (ctx) {
      ctx.clearRect(0, 0, source.width, source.height);
      ctx.drawImage(bitmap, 0, 0, source.width, source.height);
    }
    element.hidden = false;
  }

  function reset(): void {
    element.hidden = true;
    setCut(0);
  }

  return { element, show, reset };
}
