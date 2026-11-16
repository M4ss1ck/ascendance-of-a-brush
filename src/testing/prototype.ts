/**
 * Browser-only harness that runs the approved prototype's own `paint` on a fixture.
 *
 * `docs/reference/brush-bench.html` is the source of truth for the planner and the brushes
 * (see AGENTS.md). Instead of re-deriving golden hashes by hand, parity tests load that page
 * in a hidden same-origin iframe and call its top-level `analyze`/`paint`, so the port is
 * compared against the approved implementation itself.
 *
 * Two pieces of the page are neutralized before mounting: the three external font tags
 * (lines 3-5), so nothing touches the network, and the trailing top-level `renderAll()`
 * (line 739), so the generated 640px sample is never analyzed or painted. `paint` is only
 * called by the tests, on the fixture they hand in.
 */

import html from "../../docs/reference/brush-bench.html?raw";
import type { BrushName } from "../engine/brushes.ts";
import type { PaintSettings } from "../engine/paint.ts";

/** The two preconnect hints and the Google Fonts stylesheet (brush-bench.html lines 3-5). */
const FONT_LINKS = /<link\b[^>]*fonts\.(?:googleapis|gstatic)\.com[^>]*>\n?/g;

const RENDER_ALL = "\nrenderAll();";

function prototypeSource(): string {
  const withoutFonts = html.replace(FONT_LINKS, "");
  const at = withoutFonts.lastIndexOf(RENDER_ALL);
  return at < 0
    ? withoutFonts
    : withoutFonts.slice(0, at) + withoutFonts.slice(at + RENDER_ALL.length);
}

/**
 * Runs inside the iframe's global scope. `srcDrawable`, `P`, `A`, `renderId`, `panels`,
 * `PANELS`, `analyze` and `paint` are script bindings there (brush-bench.html lines
 * 474-548, 624, 716). Pixels and settings arrive on `window.parityInput`, never by
 * splicing data into this source.
 */
const PAINT_IN_PROTOTYPE = `(async () => {
  const { pixels, W, H, settings, brush } = window.parityInput;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.putImageData(new ImageData(new Uint8ClampedArray(pixels), W, H), 0, 0);
  srcDrawable = canvas;
  Object.assign(P, settings, { size: Math.max(W, H) });
  A = analyze();
  const id = ++renderId;
  const def = PANELS.find((d) => d.brush === brush);
  await paint(def, id);
  return { hash: panels[def.id].hash, strokes: panels[def.id].plan.strokes };
})()`;

let page: Promise<HTMLIFrameElement> | null = null;

function load(): Promise<HTMLIFrameElement> {
  page ??= new Promise((resolve, reject) => {
    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    iframe.srcdoc = prototypeSource();
    iframe.addEventListener("load", () => resolve(iframe), { once: true });
    iframe.addEventListener("error", () => reject(new Error("prototype iframe failed to load")), {
      once: true,
    });
    document.body.appendChild(iframe);
  });
  return page;
}

/**
 * Paints a fixture with the prototype and returns the raster hash plus its stroke plan.
 *
 * Strokes come back JSON-round-tripped so they are plain, same-realm data comparable with
 * the worker's own JSON round trip.
 */
export async function prototypePaint(
  pixels: Uint8ClampedArray,
  W: number,
  H: number,
  settings: PaintSettings,
  brush: BrushName,
): Promise<{ hash: string; strokes: unknown[] }> {
  const iframe = await load();
  const win = iframe.contentWindow as any;
  win.parityInput = { pixels, W, H, settings, brush };
  const result = await win.eval(PAINT_IN_PROTOTYPE);
  return { hash: result.hash, strokes: JSON.parse(JSON.stringify(result.strokes)) };
}
