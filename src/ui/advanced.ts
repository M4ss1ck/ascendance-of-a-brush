/**
 * The Advanced drawer (issue #6): every knob except brush and seed. Contents follow
 * ADR-0013 and the prototype's control order (docs/reference/brush-bench.html lines
 * 629-638): working-size presets, the ground, then the sliders with a live value each.
 */

import type { Ground } from "../engine/analysis.ts";
import type { Settings } from "./settings.ts";
import { tw } from "./tw.ts";

/** The numeric Advanced settings, in the prototype's order. */
type SliderKey =
  | "maxR"
  | "layers"
  | "threshold"
  | "tol"
  | "maxLen"
  | "jitter"
  | "colorJitter"
  | "palette"
  | "opacity";

type SliderSettings = Pick<Settings, SliderKey>;

interface SliderSpec {
  key: SliderKey;
  label: string;
  min: number;
  max: number;
  step: number;
}

const SLIDERS: SliderSpec[] = [
  { key: "maxR", label: "Largest brush", min: 6, max: 48, step: 2 },
  { key: "layers", label: "Layers", min: 1, max: 5, step: 1 },
  { key: "threshold", label: "Error threshold", min: 0, max: 80, step: 1 },
  { key: "tol", label: "Color tolerance", min: 5, max: 120, step: 1 },
  { key: "maxLen", label: "Curve length", min: 1, max: 16, step: 1 },
  { key: "jitter", label: "Grid jitter", min: 0, max: 1, step: 0.05 },
  { key: "colorJitter", label: "Color jitter", min: 0, max: 0.3, step: 0.01 },
  { key: "palette", label: "Palette", min: 0, max: 24, step: 2 },
  { key: "opacity", label: "Paint opacity", min: 0.3, max: 1, step: 0.05 },
];

const SIZES = [480, 640, 960, 1280] as const;

/** Value, label and preview fill for each ground. */
const GROUNDS: [Ground, string, string][] = [
  ["white", "White", "#f6f4ef"],
  ["toned", "Toned", "#86583a"],
  ["blurred", "Blurred", "linear-gradient(90deg, #c9a184, #5a6e84, #d8c39a)"],
];

/** A one-key patch, kept assignable to Settings by narrowing the key to the numeric ones. */
const patch = (key: SliderKey, value: number): Partial<SliderSettings> => ({ [key]: value });

/** The prototype's value readout: px on the radius, "off" for an empty palette. */
const format = (key: SliderKey, step: number, value: number): string => {
  if (key === "palette" && value === 0) return "off";
  if (key === "maxR") return `${value} px`;
  if (step < 0.1) return value.toFixed(2);
  if (step < 1) return value.toFixed(2).replace(/0$/, "");
  return String(value);
};

const percent = (spec: SliderSpec, value: number): string =>
  `${((value - spec.min) / (spec.max - spec.min)) * 100}%`;

/** Builds the drawer element from the current settings and reports every change. */
export function buildAdvanced(
  settings: Settings,
  update: (patch: Partial<Settings>) => void,
): HTMLElement {
  const drawer = document.createElement("aside");
  drawer.id = "advanced-drawer";
  drawer.className = tw`drawer row-start-2`;
  drawer.setAttribute("aria-label", "Advanced settings");

  const inner = document.createElement("div");
  inner.className = tw`drawer-inner`;

  const heading = document.createElement("h2");
  heading.append("Advanced");
  const close = document.createElement("button");
  close.type = "button";
  close.className = tw`btn drawer-close`;
  close.dataset.close = "";
  close.textContent = "Close";
  heading.append(close);
  inner.append(heading);

  const sizeField = document.createElement("div");
  sizeField.className = tw`field`;
  const sizeHead = document.createElement("div");
  sizeHead.className = tw`field-head`;
  const sizeName = document.createElement("b");
  sizeName.textContent = "Working size";
  sizeHead.append(sizeName);
  const seg = document.createElement("div");
  seg.className = tw`seg`;
  seg.setAttribute("role", "group");
  seg.setAttribute("aria-label", "Working size");
  const sizeButtons: [number, HTMLButtonElement][] = [];
  for (const value of SIZES) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = String(value);
    button.setAttribute("aria-pressed", String(settings.size === value));
    button.addEventListener("click", () => {
      for (const [v, el] of sizeButtons) el.setAttribute("aria-pressed", String(v === value));
      update({ size: value });
    });
    sizeButtons.push([value, button]);
    seg.append(button);
  }
  sizeField.append(sizeHead, seg);
  inner.append(sizeField);

  const groundField = document.createElement("div");
  groundField.className = tw`field`;
  const groundHead = document.createElement("div");
  groundHead.className = tw`field-head`;
  const groundName = document.createElement("b");
  groundName.textContent = "Ground";
  groundHead.append(groundName);
  const grounds = document.createElement("div");
  grounds.className = tw`grounds`;
  grounds.setAttribute("role", "group");
  grounds.setAttribute("aria-label", "Ground");
  const groundButtons: [Ground, HTMLButtonElement][] = [];
  for (const [value, label, fill] of GROUNDS) {
    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("aria-pressed", String(settings.ground === value));
    const preview = document.createElement("i");
    preview.style.background = fill;
    const text = document.createElement("span");
    text.textContent = label;
    button.append(preview, text);
    button.addEventListener("click", () => {
      for (const [g, el] of groundButtons) el.setAttribute("aria-pressed", String(g === value));
      update({ ground: value });
    });
    groundButtons.push([value, button]);
    grounds.append(button);
  }
  groundField.append(groundHead, grounds);
  inner.append(groundField);

  for (const spec of SLIDERS) {
    const field = document.createElement("label");
    field.className = tw`field`;
    const head = document.createElement("span");
    head.className = tw`field-head`;
    const name = document.createElement("b");
    name.textContent = spec.label;
    const output = document.createElement("output");
    const input = document.createElement("input");
    input.type = "range";
    input.min = String(spec.min);
    input.max = String(spec.max);
    input.step = String(spec.step);
    const value = settings[spec.key];
    input.value = String(value);
    input.style.setProperty("--p", percent(spec, value));
    output.textContent = format(spec.key, spec.step, value);
    input.addEventListener("input", () => {
      const next = Number(input.value);
      output.textContent = format(spec.key, spec.step, next);
      input.style.setProperty("--p", percent(spec, next));
      update(patch(spec.key, next));
    });
    head.append(name, output);
    field.append(head, input);
    inner.append(field);
  }

  drawer.append(inner);
  return drawer;
}
