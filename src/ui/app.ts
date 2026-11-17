/**
 * The app shell (issue #6): the bookcloth wall with its gilt frame, the parchment ledge and
 * the Advanced drawer. The source image is decoded once and cloned per paint; the worker
 * replies with a snapshot per layer, shown in the strip under the frame, and the finished
 * raster, which is shown at 1:1. The frame carries the compare wipe.
 */

import type { BrushName } from "../engine/brushes.ts";
import type { LayerProgress, PaintImageRequest, PaintReply } from "../engine/paint.ts";
import { workingSize } from "../engine/resample.ts";
import { buildAdvanced } from "./advanced.ts";
import { createPages } from "./pages.ts";
import { createRepainter } from "./repaint.ts";
import { anotherSeed, parseSettings, writeSettings, type Settings } from "./settings.ts";
import { startShowcase } from "./showcase.ts";
import { drawSwatch } from "./swatch.ts";
import { tw } from "./tw.ts";
import { createWipe } from "./wipe.ts";

const ROMAN = ["I", "II", "III", "IV", "V"] as const;
const PICK_W = 92;
const PICK_H = 58;
/** Frame padding (12 px each side) plus the corner ornaments reaching 7 px out. */
const FRAME_INSET = 38;
/** The source line reserved above the frame. */
const LINE_SPACE = 22;
const BRUSHES: [BrushName, string][] = [
  ["dab", "Dab"],
  ["curve", "Curved"],
];
const ORN = `<svg viewBox="0 0 14 14" aria-hidden="true"><path d="M7 0 L9 5 L14 7 L9 9 L7 14 L5 9 L0 7 L5 5Z" fill="currentColor"/></svg>`;

/** A hairline divider between ledge groups; hidden when the ledge wraps on phones. */
const band = (): HTMLSpanElement => {
  const divider = document.createElement("span");
  divider.className = tw`band hidden sm:block`;
  return divider;
};

interface PaintJob {
  generation: number;
  settings: Settings;
}

export function mountApp(root: HTMLElement): void {
  let settings = parseSettings(location.search);
  let source: ImageBitmap | null = null;
  let generation = 0;
  /** Every layer of the current paint, for the layer strip and its reveal. */
  let layers: LayerProgress[] = [];
  let drawerOpen = false;
  let showcase: { stop(): void } | null = null;

  const painting = document.createElement("canvas");
  painting.className = tw`block`;

  const wipe = createWipe(painting);
  const pages = createPages(painting);

  /** The painting's box: the wipe and the layer reveal overlay sit exactly on it. */
  const canvasBox = document.createElement("div");
  canvasBox.className = tw`relative`;
  canvasBox.append(painting, wipe.element, pages.overlay);

  const frame = document.createElement("figure");
  frame.className = "frame";
  frame.append(canvasBox);
  for (const corner of ["orn-tl", "orn-tr", "orn-bl", "orn-br"]) {
    const ornament = document.createElement("span");
    ornament.className = `orn ${corner}`;
    ornament.innerHTML = ORN;
    frame.append(ornament);
  }

  const sourceLine = document.createElement("div");
  sourceLine.className = tw`pointer-events-none absolute top-0 left-0 w-full truncate font-metal text-[13px] leading-tight tracking-[0.04em] text-parchment/70`;
  sourceLine.hidden = true;

  const stage = document.createElement("div");
  stage.className = tw`relative w-fit max-w-full pt-[22px]`;
  stage.append(frame, pages.element, sourceLine);

  const holder = document.createElement("div");
  holder.className = tw`grid h-full min-h-0 w-full min-w-0 place-items-center`;
  holder.append(stage);

  const wall = document.createElement("main");
  wall.className = tw`relative grid min-h-0 min-w-0 grid-cols-[minmax(0,1fr)] grid-rows-[minmax(0,1fr)] place-items-center overflow-hidden px-4 py-4`;
  wall.append(holder);

  const brushLabel = document.createElement("span");
  brushLabel.className = tw`font-metal text-[13px] tracking-[0.06em] text-sepia`;
  brushLabel.textContent = "Brush";

  const brushHost = document.createElement("div");
  brushHost.className = tw`flex gap-2.5`;
  brushHost.setAttribute("role", "group");
  brushHost.setAttribute("aria-label", "Brush");
  const brushButtons: [BrushName, HTMLButtonElement][] = [];
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  for (const [brush, label] of BRUSHES) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "pick";
    button.setAttribute("aria-pressed", String(settings.brush === brush));
    const swatch = document.createElement("canvas");
    swatch.width = Math.round(PICK_W * dpr);
    swatch.height = Math.round(PICK_H * dpr);
    swatch.style.width = `${PICK_W}px`;
    swatch.style.height = `${PICK_H}px`;
    const ctx = swatch.getContext("2d");
    if (ctx) {
      ctx.scale(dpr, dpr);
      drawSwatch(ctx, brush, PICK_W, PICK_H);
    }
    const name = document.createElement("span");
    name.textContent = label;
    button.append(swatch, name);
    button.addEventListener("click", () => {
      for (const [b, el] of brushButtons) el.setAttribute("aria-pressed", String(b === brush));
      setSettings({ brush });
    });
    brushButtons.push([brush, button]);
    brushHost.append(button);
  }

  const seedLabel = document.createElement("span");
  seedLabel.className = tw`font-metal text-[13px] tracking-[0.06em] text-sepia`;
  seedLabel.textContent = "Seed";
  const seal = document.createElement("label");
  seal.className = "seal";
  const seedInput = document.createElement("input");
  seedInput.type = "number";
  seedInput.step = "1";
  seedInput.inputMode = "numeric";
  seedInput.setAttribute("aria-label", "Seed");
  seedInput.value = String(settings.seed);
  seedInput.addEventListener("input", () => {
    const value = Number(seedInput.value);
    if (Number.isSafeInteger(value)) setSettings({ seed: value });
  });
  seedInput.addEventListener("blur", () => {
    seedInput.value = String(settings.seed);
  });
  seal.append(seedInput);
  const another = document.createElement("button");
  another.type = "button";
  another.className = "btn";
  another.textContent = "Another";
  another.addEventListener("click", () => setSettings({ seed: anotherSeed(settings.seed) }));

  const status = document.createElement("span");
  status.className = tw`min-w-32 text-[15px] text-sepia italic`;
  status.setAttribute("aria-live", "polite");

  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = "image/*";
  fileInput.hidden = true;
  fileInput.addEventListener("change", () => {
    const file = fileInput.files?.[0];
    if (file) void loadFile(file);
    fileInput.value = "";
  });

  const newImage = document.createElement("button");
  newImage.type = "button";
  newImage.className = "btn beckon";
  newImage.textContent = "New image";
  newImage.addEventListener("click", () => fileInput.click());

  const advancedButton = document.createElement("button");
  advancedButton.type = "button";
  advancedButton.className = "btn";
  advancedButton.textContent = "Advanced";
  advancedButton.setAttribute("aria-expanded", "false");
  advancedButton.setAttribute("aria-controls", "advanced-drawer");

  const brushGroup = document.createElement("div");
  brushGroup.className = tw`relative flex items-center gap-3`;
  brushGroup.append(brushLabel, brushHost);

  const seedGroup = document.createElement("div");
  seedGroup.className = tw`relative flex items-center gap-3`;
  seedGroup.append(seedLabel, seal, another);

  const spacer = document.createElement("span");
  spacer.className = tw`flex-1`;

  const ledge = document.createElement("footer");
  ledge.className = tw`ledge relative z-10 row-start-3 flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 text-ink sm:gap-x-6 sm:px-6 sm:py-4`;
  ledge.append(
    brushGroup,
    band(),
    seedGroup,
    band(),
    status,
    spacer,
    newImage,
    advancedButton,
    fileInput,
  );

  const drawer = buildAdvanced(settings, setSettings);

  const app = document.createElement("div");
  app.className = tw`grid h-dvh grid-cols-[minmax(0,1fr)] grid-rows-[minmax(0,1fr)_auto_auto] overflow-hidden`;
  app.append(wall, ledge, drawer);
  root.replaceChildren(app);

  // The empty wall shows the demo book until an image is loaded (ADR-0018).
  frame.classList.add("demo");
  showcase = startShowcase(painting, (brush) => {
    for (const [name, button] of brushButtons) button.classList.toggle("glint", name === brush);
  });
  fit();

  frame.addEventListener("click", () => {
    if (!source) fileInput.click();
  });

  /** Marks the status as a normal update or as the inline error alert. */
  function setStatus(text: string): void {
    status.removeAttribute("role");
    status.textContent = text;
  }

  function showError(text: string): void {
    status.setAttribute("role", "alert");
    status.textContent = text;
  }

  /** The first drawer control that is actually shown; the Close button is phone-only. */
  function firstControl(): HTMLElement | null {
    for (const control of drawer.querySelectorAll<HTMLElement>("button, input")) {
      if (control.offsetParent !== null) return control;
    }
    return null;
  }

  function setDrawer(open: boolean): void {
    drawerOpen = open;
    drawer.classList.toggle("open", open);
    advancedButton.setAttribute("aria-expanded", String(open));
    if (open) firstControl()?.focus();
    else advancedButton.focus();
  }

  advancedButton.addEventListener("click", () => setDrawer(!drawerOpen));
  const closeButton = drawer.querySelector<HTMLButtonElement>("[data-close]");
  if (closeButton) closeButton.addEventListener("click", () => setDrawer(false));
  document.addEventListener("keydown", (event) => {
    if (drawerOpen && event.key === "Escape") setDrawer(false);
  });

  /** Fits the canvas in the free wall space, up or down, keeping its aspect. */
  function fit(): void {
    const width = painting.width;
    const height = painting.height;
    if (!width || !height || frame.hidden) return;
    const availableW = holder.clientWidth - FRAME_INSET;
    const availableH = holder.clientHeight - FRAME_INSET - LINE_SPACE - pages.element.offsetHeight;
    if (availableW <= 0 || availableH <= 0) return;
    const scale = Math.min(availableW / width, availableH / height);
    painting.style.width = `${Math.max(1, Math.floor(width * scale))}px`;
    painting.style.height = `${Math.max(1, Math.floor(height * scale))}px`;
  }

  const observer = new ResizeObserver(fit);
  observer.observe(holder);

  /** Canvas backing stays at the working size; only its CSS size follows the free space. */
  function setWorkingSize(size: number): void {
    if (!source) return;
    const { W, H } = workingSize(source.width, source.height, size);
    if (painting.width !== W || painting.height !== H) {
      painting.width = W;
      painting.height = H;
    }
    fit();
  }

  function resetLayers(): void {
    pages.clear();
    for (const layer of layers) layer.snapshot.close();
    layers = [];
  }

  function requestPaint(): void {
    if (!source) return;
    generation += 1;
    resetLayers();
    // The backing size only changes in showPainted, so the last painting stays up meanwhile.
    // The first layer is already being painted, so its page pulses from the start.
    pages.update(layers, false);
    setStatus("Painting…");
    repainter.request({ generation, settings });
  }

  const repainter = createRepainter<PaintJob, Worker>(
    () => new Worker(new URL("../engine/painter.worker.ts", import.meta.url), { type: "module" }),
    startPaint,
  );

  function startPaint(worker: Worker, job: PaintJob): void {
    const gen = job.generation;
    worker.addEventListener("message", (event: MessageEvent<LayerProgress | PaintReply>) => {
      const message = event.data;
      if (gen !== generation) {
        if (message.kind === "layer") message.snapshot.close();
        return;
      }
      if (message.kind === "layer") {
        layers.push(message);
        pages.update(layers, false);
        const index = ROMAN[message.layer] ?? String(message.layer + 1);
        const count = ROMAN[message.layers - 1] ?? String(message.layers);
        setStatus(`Layer ${index} of ${count}…`);
        return;
      }
      pages.update(layers, true);
      showPainted(message, job);
      setStatus("Finished.");
    });
    worker.addEventListener("error", () => {
      if (gen === generation) showError("The painter stopped unexpectedly.");
    });

    const current = source;
    if (!current) return;
    void createImageBitmap(current).then(
      (bitmap) => {
        if (gen !== generation) {
          bitmap.close();
          return;
        }
        const request: PaintImageRequest = {
          kind: "paintImage",
          bitmap,
          size: job.settings.size,
          settings: job.settings,
          brush: job.settings.brush,
        };
        worker.postMessage(request, { transfer: [bitmap] });
      },
      () => {
        if (gen === generation) showError("Couldn't prepare the image for painting.");
      },
    );
  }

  function showPainted(reply: PaintReply, job: PaintJob): void {
    const current = source;
    if (!current || !reply.crop.w || !reply.crop.h) return;
    const { W, H } = workingSize(current.width, current.height, job.settings.size);
    if (painting.width !== W || painting.height !== H) {
      painting.width = W;
      painting.height = H;
    }
    const ctx = painting.getContext("2d");
    if (!ctx) return;
    const pixels = new Uint8ClampedArray(reply.pixels);
    ctx.putImageData(new ImageData(pixels, reply.crop.w, reply.crop.h), reply.crop.x, reply.crop.y);
    fit();
    wipe.show(current);
  }

  function syncLedge(): void {
    if (document.activeElement !== seedInput) seedInput.value = String(settings.seed);
    for (const [brush, button] of brushButtons) {
      button.setAttribute("aria-pressed", String(settings.brush === brush));
    }
  }

  function setSettings(next: Partial<Settings>): void {
    settings = { ...settings, ...next };
    const query = writeSettings(settings);
    history.replaceState(null, "", query ? `${location.pathname}?${query}` : location.pathname);
    syncLedge();
    if (source) requestPaint();
  }

  async function loadFile(file: File): Promise<void> {
    let bitmap: ImageBitmap;
    try {
      bitmap = await createImageBitmap(file);
    } catch {
      showError(`Couldn't read “${file.name}” as an image.`);
      return;
    }
    source?.close();
    source = bitmap;
    showcase?.stop();
    showcase = null;
    frame.classList.remove("demo");
    sourceLine.textContent = `${file.name} · ${bitmap.width} × ${bitmap.height}`;
    sourceLine.hidden = false;
    newImage.classList.remove("beckon");
    wipe.reset();
    setWorkingSize(settings.size);
    requestPaint();
  }

  window.addEventListener("dragover", (event) => event.preventDefault());
  window.addEventListener("drop", (event) => {
    event.preventDefault();
    const file = event.dataTransfer?.files[0];
    if (file) void loadFile(file);
  });

  setStatus("Drop an image or choose New image.");
}
