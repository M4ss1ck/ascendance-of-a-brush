/* oxlint-disable -- PROTOTYPE (issue #6): throwaway code on a throwaway branch. */
/**
 * PROTOTYPE (issue #6), throwaway. Shared plumbing for the UI variants: load an image,
 * resample it like the prototype, ask the real paint worker for a plan, then replay that
 * plan layer by layer on a main-thread canvas so the variants can show progress.
 *
 * The production version gets per-layer snapshots from the worker itself (Q3); replaying
 * here only fakes the timing so the progress UI can be judged.
 */
import type { Ground } from "../engine/analysis.ts";
import { drawGround, drawStroke, type BrushName, type Stroke } from "../engine/brushes.ts";
import type { PaintReply, PaintRequest, PaintSettings } from "../engine/paint.ts";

export interface Settings extends PaintSettings {
  size: number;
}

export const DEFAULTS: Settings = {
  seed: 7,
  size: 640,
  maxR: 24,
  layers: 4,
  threshold: 24,
  tol: 30,
  maxLen: 8,
  jitter: 0.6,
  colorJitter: 0.06,
  palette: 0,
  opacity: 0.9,
  ground: "toned" as Ground,
};

export interface SliderSpec {
  k: keyof Settings;
  label: string;
  min: number;
  max: number;
  step: number;
  unit?: string;
  hint: string;
}

/** ADR-0013 ranges, in prototype order. */
export const ADVANCED: SliderSpec[] = [
  {
    k: "maxR",
    label: "Largest brush",
    min: 6,
    max: 48,
    step: 2,
    unit: "px",
    hint: "first layer's radius",
  },
  { k: "layers", label: "Layers", min: 1, max: 5, step: 1, hint: "coarse to fine passes" },
  {
    k: "threshold",
    label: "Error threshold",
    min: 0,
    max: 80,
    step: 1,
    hint: "how wrong a cell must be to repaint",
  },
  {
    k: "tol",
    label: "Color tolerance",
    min: 5,
    max: 120,
    step: 1,
    hint: "when a curve stops growing",
  },
  {
    k: "maxLen",
    label: "Curve length",
    min: 1,
    max: 16,
    step: 1,
    hint: "segments per curved stroke",
  },
  {
    k: "jitter",
    label: "Grid jitter",
    min: 0,
    max: 1,
    step: 0.05,
    hint: "how loose stroke placement is",
  },
  {
    k: "colorJitter",
    label: "Color jitter",
    min: 0,
    max: 0.3,
    step: 0.01,
    hint: "per-stroke color drift",
  },
  { k: "palette", label: "Palette", min: 0, max: 24, step: 2, hint: "0 = every color" },
  {
    k: "opacity",
    label: "Paint opacity",
    min: 0.3,
    max: 1,
    step: 0.05,
    hint: "how much each stroke covers",
  },
];
export const SIZES = [480, 640, 960, 1280];
export const GROUNDS: [Ground, string][] = [
  ["white", "White"],
  ["toned", "Toned"],
  ["blurred", "Underpainting"],
];

export interface Progress {
  layer: number; // 1-based layer being painted, 0 = ground
  layers: number;
  radius: number;
  done: boolean;
}

type Listener = () => void;

export class Session {
  settings: Settings = { ...DEFAULTS };
  brush: BrushName = "curve";
  name = "";
  sourceSize: [number, number] | null = null;
  error = "";
  progress: Progress | null = null;
  /** The resampled source at working size. */
  readonly source = document.createElement("canvas");
  /** The painting being built. */
  readonly canvas = document.createElement("canvas");
  /** One snapshot per finished layer, for variants that show the stack. */
  snapshots: HTMLCanvasElement[] = [];

  private drawable: (CanvasImageSource & { width: number; height: number }) | null = null;
  private worker: Worker | null = null;
  private runId = 0;
  private timer = 0;
  private listeners: Listener[] = [];

  get hasSource(): boolean {
    return this.drawable !== null;
  }

  on(fn: Listener): void {
    this.listeners.push(fn);
  }
  private emit(): void {
    for (const fn of this.listeners) fn();
  }

  async loadFile(file: File): Promise<void> {
    try {
      const bmp = await createImageBitmap(file);
      this.error = "";
      this.useDrawable(bmp, file.name);
    } catch {
      this.error = `Couldn't read “${file.name}” as an image.`;
      this.emit();
    }
  }

  useDrawable(d: CanvasImageSource & { width: number; height: number }, name: string): void {
    this.drawable = d;
    this.name = name;
    this.sourceSize = [d.width, d.height];
    this.paintNow();
  }

  set<K extends keyof Settings>(k: K, v: Settings[K]): void {
    this.settings[k] = v;
    this.schedule();
  }
  setBrush(b: BrushName): void {
    this.brush = b;
    this.schedule();
  }
  nextSeed(): void {
    this.set("seed", this.settings.seed + 1);
  }

  schedule(): void {
    this.emit();
    clearTimeout(this.timer);
    this.timer = window.setTimeout(() => this.paintNow(), 180);
  }

  private paintNow(): void {
    const d = this.drawable;
    if (!d) return this.emit();
    const id = ++this.runId;
    // Cancel by killing the busy worker (Q2): paint() is synchronous.
    this.worker?.terminate();
    const worker = new Worker(new URL("../engine/painter.worker.ts", import.meta.url), {
      type: "module",
    });
    this.worker = worker;

    const s = this.settings,
      sc = s.size / Math.max(d.width, d.height);
    const W = Math.max(16, Math.round(d.width * sc)),
      H = Math.max(16, Math.round(d.height * sc));
    this.source.width = this.canvas.width = W;
    this.source.height = this.canvas.height = H;
    const sctx = this.source.getContext("2d", { willReadFrequently: true })!;
    sctx.imageSmoothingQuality = "high";
    sctx.drawImage(d, 0, 0, W, H);
    const pixels = sctx.getImageData(0, 0, W, H).data;

    this.snapshots = [];
    this.progress = { layer: 0, layers: s.layers, radius: s.maxR, done: false };
    this.emit();

    worker.onmessage = (e: MessageEvent<PaintReply>) => {
      worker.terminate();
      if (id !== this.runId) return;
      this.worker = null;
      void this.animate(id, e.data, W, H);
    };
    const req: PaintRequest = {
      kind: "paint",
      pixels,
      W,
      H,
      settings: { ...s },
      brush: this.brush,
    };
    worker.postMessage(req, { transfer: [pixels.buffer] });
  }

  private async animate(id: number, reply: PaintReply, W: number, H: number): Promise<void> {
    const ctx = this.canvas.getContext("2d")!;
    ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, W, H);
    drawGround(ctx, reply.plan.ground, W, H);
    // Split the flat stroke list back into layers: every stroke of a layer shares its size.
    const layers: Stroke[][] = [];
    let last = -1;
    for (const st of reply.plan.strokes) {
      const size = st.b === "dab" ? st.r : st.w;
      if (size !== last) layers.push([]);
      last = size;
      layers.at(-1)!.push(st);
    }
    const n = layers.length;
    // Yield through a MessageChannel like the prototype: rAF stalls in unfocused tabs.
    const mc = new MessageChannel();
    const frame = () =>
      new Promise<void>((r) => {
        mc.port1.onmessage = () => r();
        mc.port2.postMessage(0);
      });
    const pace = () => new Promise<void>((r) => setTimeout(r, 16));
    for (let li = 0; li < n; li++) {
      const ls = layers[li]!;
      const R = Math.max(1.5, this.settings.maxR / 2 ** li);
      this.progress = { layer: li + 1, layers: n, radius: R, done: false };
      this.emit();
      const chunk = Math.max(1, Math.ceil(ls.length / 24));
      for (let i = 0; i < ls.length; i++) {
        drawStroke(ctx, ls[i]!);
        if (i % chunk === chunk - 1) {
          await (document.hidden ? frame() : pace());
          if (id !== this.runId) return;
          this.emit();
        }
      }
      const snap = document.createElement("canvas");
      snap.width = W;
      snap.height = H;
      snap.getContext("2d")!.drawImage(this.canvas, 0, 0);
      this.snapshots.push(snap);
    }
    ctx.globalAlpha = 1;
    this.progress = { layer: n, layers: n, radius: 0, done: true };
    this.emit();
  }
}

/** Wires drag-and-drop of image files anywhere on `target`. */
export function acceptDrops(
  target: HTMLElement,
  session: Session,
  onHover: (on: boolean) => void,
): void {
  target.addEventListener("dragover", (e) => {
    e.preventDefault();
    onHover(true);
  });
  target.addEventListener("dragleave", (e) => {
    if (!e.relatedTarget || !target.contains(e.relatedTarget as Node)) onHover(false);
  });
  target.addEventListener("drop", (e) => {
    e.preventDefault();
    onHover(false);
    const f = e.dataTransfer?.files[0];
    if (f) void session.loadFile(f);
  });
}

export function fmt(spec: SliderSpec, v: number): string {
  const s =
    spec.step < 0.1 ? v.toFixed(2) : spec.step < 1 ? v.toFixed(2).replace(/0$/, "") : String(v);
  return spec.k === "palette" && v === 0 ? "off" : s + (spec.unit ? ` ${spec.unit}` : "");
}

/** A hidden file input; returns a function that opens the picker. */
export function filePicker(session: Session, host: HTMLElement): () => void {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.hidden = true;
  input.addEventListener("change", () => {
    const f = input.files?.[0];
    if (f) void session.loadFile(f);
    input.value = "";
  });
  host.append(input);
  return () => input.click();
}

/** A real stroke drawn by the engine, for brush swatches. */
export function brushSwatch(
  brush: BrushName,
  W: number,
  H: number,
  color: [number, number, number],
): HTMLCanvasElement {
  const cv = document.createElement("canvas");
  const dpr = 2;
  cv.width = W * dpr;
  cv.height = H * dpr;
  cv.style.width = `${W}px`;
  cv.style.height = `${H}px`;
  const ctx = cv.getContext("2d")!;
  ctx.scale(dpr, dpr);
  if (brush === "dab") {
    const pts = [0.18, 0.38, 0.6, 0.82];
    pts.forEach((t, i) =>
      drawStroke(ctx, {
        b: "dab",
        x: W * t,
        y: H * (0.5 + (i % 2 ? 0.08 : -0.06)),
        r: H * (0.26 - i * 0.03),
        c: color,
        a: 0.9,
      }),
    );
  } else {
    const pts: [number, number][] = [];
    for (let i = 0; i <= 8; i++) {
      const t = i / 8;
      pts.push([W * (0.1 + 0.8 * t), H * (0.62 - 0.28 * Math.sin(t * Math.PI))]);
    }
    drawStroke(ctx, { b: "curve", pts, w: H * 0.42, c: color, a: 0.9, seed: 11 });
  }
  return cv;
}
