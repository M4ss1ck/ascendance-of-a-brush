/**
 * The layer pages (issue #6): a strip under the frame with one snapshot per layer of the
 * current paint and its brush radius, and the reveal that puts a hovered or focused snapshot
 * over the painting, tagged "after layer N". The layer still painting is a pulsing page.
 * Rewritten from the prototype's variant D (`vd-pages`, `vd-tag`); the snapshots are the
 * worker's per-layer progress messages.
 */

import type { LayerProgress } from "../engine/paint.ts";
import { tw } from "./tw.ts";

const ROMAN = ["I", "II", "III", "IV", "V"] as const;
/** A page thumbnail's height in CSS pixels; the width follows the painting's aspect. */
const THUMB = 44;

export interface Pages {
  /** The strip, mounted under the frame inside the stage. Its height is always reserved. */
  element: HTMLDivElement;
  /** The reveal over the painting; mount it last so it covers the wipe too. */
  overlay: HTMLDivElement;
  /** Rebuilds the strip; `done` drops the pulsing page for the layer still painting. */
  update(layers: LayerProgress[], done: boolean): void;
  /** Empties the strip and takes the reveal away. */
  clear(): void;
}

export function createPages(painting: HTMLCanvasElement): Pages {
  const dpr = Math.max(1, window.devicePixelRatio || 1);

  const element = document.createElement("div");
  element.className = tw`flex h-[68px] w-full items-start justify-start gap-2 overflow-x-auto px-2 py-1 sm:justify-center`;
  element.setAttribute("role", "group");
  element.setAttribute("aria-label", "Layers");

  const overlay = document.createElement("div");
  overlay.className = "reveal";
  overlay.hidden = true;
  overlay.setAttribute("aria-hidden", "true");
  const peekCanvas = document.createElement("canvas");
  const tag = document.createElement("span");
  tag.className = "reveal-tag";
  overlay.append(peekCanvas, tag);

  function peek(snapshot: ImageBitmap | null, index: number): void {
    overlay.hidden = !snapshot;
    if (!snapshot || !painting.width || !painting.height) return;
    peekCanvas.width = painting.width;
    peekCanvas.height = painting.height;
    const ctx = peekCanvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(snapshot, 0, 0, peekCanvas.width, peekCanvas.height);
    tag.textContent = `after layer ${ROMAN[index] ?? String(index + 1)}`;
  }

  function update(layers: LayerProgress[], done: boolean): void {
    overlay.hidden = true;
    element.replaceChildren();
    for (const [index, layer] of layers.entries()) {
      const page = document.createElement("button");
      page.type = "button";
      page.className = "page";
      const thumb = document.createElement("canvas");
      thumb.height = Math.round(THUMB * dpr);
      thumb.width = Math.max(
        1,
        Math.round(THUMB * dpr * (layer.snapshot.width / layer.snapshot.height)),
      );
      thumb.getContext("2d")?.drawImage(layer.snapshot, 0, 0, thumb.width, thumb.height);
      const radius = document.createElement("span");
      radius.className = "page-radius";
      radius.textContent = `r ${layer.radius}`;
      page.append(thumb, radius);
      page.addEventListener("pointerenter", () => peek(layer.snapshot, index));
      page.addEventListener("pointerleave", () => peek(null, index));
      page.addEventListener("focus", () => peek(layer.snapshot, index));
      page.addEventListener("blur", () => peek(null, index));
      element.append(page);
    }
    // The next page after the last snapshot is the layer being painted right now.
    const total = layers[0]?.layers ?? layers.length + 1;
    if (!done && layers.length < total) {
      const now = document.createElement("span");
      now.className = "page-now";
      const ratio = painting.width && painting.height ? painting.width / painting.height : 1;
      now.style.width = `${Math.round(THUMB * ratio)}px`;
      now.style.height = `${THUMB}px`;
      element.append(now);
    }
  }

  function clear(): void {
    overlay.hidden = true;
    element.replaceChildren();
  }

  return { element, overlay, update, clear };
}
