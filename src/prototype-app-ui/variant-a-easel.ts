/* oxlint-disable -- PROTOTYPE (issue #6): throwaway code on a throwaway branch. */
/**
 * PROTOTYPE (issue #6), variant A, "Easel".
 * The painting hangs on a dark studio wall; the controls sit on a wooden easel ledge
 * below it (real engine strokes as brush picks, a stamped seed number). Advanced is a
 * drawer that slides up from the ledge. Progress is a row of roman-numeral layer marks.
 * Compare with the source by dragging a wipe across the painting.
 */
import {
  ADVANCED,
  GROUNDS,
  SIZES,
  acceptDrops,
  brushSwatch,
  filePicker,
  fmt,
  type Session,
} from "./session.ts";

const ROMAN = ["I", "II", "III", "IV", "V"];

const CSS = /* css */ `
.va{--wall:#231c16;--wall2:#2c231b;--cream:#efe6d2;--ochre:#d29a3a;--umber:#7a4b2a;--ink:#1a140f;
  min-height:100dvh;display:grid;grid-template-rows:auto 1fr auto auto;color:var(--cream);
  background:var(--wall) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='240'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 .1 0 0 0 0 .08 0 0 0 0 .06 0 0 0 .55 0'/%3E%3C/filter%3E%3Crect width='240' height='240' filter='url(%23n)'/%3E%3C/svg%3E");
  font-family:"IBM Plex Mono",ui-monospace,monospace;font-size:12px;letter-spacing:.02em}
.va *{box-sizing:border-box}
.va-top{display:flex;justify-content:space-between;align-items:baseline;padding:18px 28px 0;gap:16px}
.va-mark{font:italic 500 26px/1 "Cormorant Garamond",serif;letter-spacing:0}
.va-mark b{font-style:normal;font-weight:600}
.va-src{opacity:.6;text-transform:uppercase;font-size:11px;text-align:right}
.va-wall{display:grid;place-items:center;padding:24px 16px 8px;min-height:0}
.va-frame{position:relative;line-height:0;box-shadow:0 1px 0 #ffffff14 inset,0 30px 60px -20px #000c,0 0 0 1px #0006,
  6px 6px 0 -1px #3b2a1c,7px 7px 0 -1px #00000060}
.va-frame canvas{display:block;max-width:min(92vw,1100px);max-height:calc(100dvh - 300px);width:auto;height:auto}
.va-frame .va-paint{position:absolute;inset:0;width:100%;height:100%;max-height:none}
.va-wipe{position:absolute;top:-10px;bottom:-10px;width:0;border-left:1px solid var(--cream);cursor:ew-resize;touch-action:none}
.va-wipe span{position:absolute;bottom:-8px;left:-24px;width:48px;height:22px;border-radius:11px;background:var(--cream);color:var(--ink);
  display:grid;place-items:center;font-size:11px;box-shadow:0 4px 10px #0008}
.va-wipe i{position:absolute;top:-2px;left:-34px;font:italic 13px/1 "Cormorant Garamond",serif;color:var(--cream);opacity:.85;white-space:nowrap}
.va-wipe i+i{left:8px}
.va-empty{width:min(80vw,640px);aspect-ratio:4/3;display:grid;place-items:center;text-align:center;color:#5b4a38;cursor:pointer;
  background-color:#e9e0cd;
  background-image:repeating-linear-gradient(0deg,#0000 0 2px,#7a5a3a10 2px 3px),repeating-linear-gradient(90deg,#0000 0 2px,#7a5a3a0d 2px 3px);
  box-shadow:0 30px 60px -20px #000c,6px 6px 0 -1px #3b2a1c;transition:box-shadow .2s}
.va-empty.hover{box-shadow:0 0 0 3px var(--ochre),0 30px 60px -20px #000c}
.va-empty h2{font:italic 500 34px/1.1 "Cormorant Garamond",serif;margin:0 0 10px;color:#3d2c1e}
.va-empty p{margin:0;font-size:12px}
.va-empty u{text-decoration-color:var(--ochre);text-underline-offset:3px}
.va-err{color:#ff9d7a;text-align:center;padding:4px}
.va-marks{display:flex;justify-content:center;gap:22px;padding:10px 0 14px;font:500 15px/1 "Cormorant Garamond",serif}
.va-marks div{display:grid;justify-items:center;gap:4px;opacity:.25;transition:opacity .3s}
.va-marks div small{font:10px/1 "IBM Plex Mono",monospace}
.va-marks .done{opacity:.9}.va-marks .now{opacity:1;color:var(--ochre)}
.va-marks .now::after{content:"";width:18px;height:2px;background:var(--ochre);animation:va-p 1s ease-in-out infinite alternate}
@keyframes va-p{from{transform:scaleX(.2)}to{transform:scaleX(1)}}
.va-status{font:italic 15px/1 "Cormorant Garamond",serif;opacity:.75;align-self:center;min-width:120px}
.va-ledge{position:relative;display:flex;align-items:center;gap:28px;padding:14px 28px 18px;flex-wrap:wrap;
  background:linear-gradient(#0000 0 3px,#0003 3px 4px,#0000 4px),
    repeating-linear-gradient(90deg,#ffffff06 0 1px,#0000 1px 7px,#00000010 7px 8px,#0000 8px 23px),
    linear-gradient(#7a5536,#5a3c25 30%,#4a3120);
  box-shadow:0 -1px 0 #a07a52 inset,0 -14px 30px -10px #0009}
.va-brushes{display:flex;gap:6px}
.va-brush{all:unset;cursor:pointer;display:grid;justify-items:center;gap:2px;padding:6px 10px 4px;border-radius:3px;transition:transform .15s}
.va-brush canvas{filter:drop-shadow(0 2px 1px #0007)}
.va-brush span{font-size:10px;text-transform:uppercase;opacity:.7}
.va-brush[aria-pressed=true]{transform:translateY(-4px);background:#0000002a}
.va-brush[aria-pressed=true] span{opacity:1;color:var(--ochre)}
.va-brush:focus-visible,.va-btn:focus-visible{outline:2px solid var(--ochre);outline-offset:2px}
.va-seed{display:flex;align-items:center;gap:8px}
.va-seed label{font:italic 22px/1 "Cormorant Garamond",serif;opacity:.8}
.va-seed input{all:unset;width:5ch;font:600 24px/1 "Cormorant Garamond",serif;border-bottom:1px dashed #efe6d266;text-align:center}
.va-btn{all:unset;cursor:pointer;padding:7px 12px;border:1px solid #efe6d24d;border-radius:2px;text-transform:uppercase;font-size:11px}
.va-btn:hover{border-color:var(--cream)}
.va-spacer{flex:1}
.va-drawer{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:18px 28px;padding:0 28px;max-height:0;overflow:hidden;
  background:#e8dfcb;color:var(--ink);transition:max-height .35s ease,padding .35s ease;border-top:1px solid #0000}
.va-drawer.open{max-height:520px;padding:22px 28px 26px;overflow:auto;border-top-color:#a07a52}
.va-field{display:grid;gap:6px}
.va-field header{display:flex;justify-content:space-between;align-items:baseline}
.va-field b{font:600 16px/1 "Cormorant Garamond",serif;letter-spacing:0}
.va-field output{font-size:11px}
.va-field small{font-size:10px;opacity:.55}
.va-field input[type=range]{accent-color:var(--umber);width:100%}
.va-seg{display:flex;border:1px solid #1a140f40;border-radius:2px;overflow:hidden}
.va-seg button{all:unset;cursor:pointer;flex:1;text-align:center;padding:6px 0;font-size:11px}
.va-seg button[aria-pressed=true]{background:var(--ink);color:var(--cream)}
.va-grounds{display:flex;gap:8px}
.va-grounds button{all:unset;cursor:pointer;display:grid;gap:4px;justify-items:center;font-size:10px}
.va-grounds i{width:44px;height:30px;box-shadow:0 0 0 1px #0003}
.va-grounds button[aria-pressed=true] i{box-shadow:0 0 0 2px var(--ink)}
@media (max-width:640px){.va-ledge{gap:14px;padding:12px 16px}.va-top{padding:14px 16px 0}.va-marks{gap:14px}}
`;

export function mountEasel(root: HTMLElement, session: Session): void {
  const style = document.createElement("style");
  style.textContent = CSS;
  document.head.append(style);
  root.innerHTML = `
  <div class="va">
    <header class="va-top"><div class="va-mark">Ascendance <b>of a</b> Brush</div><div class="va-src"></div></header>
    <section class="va-wall"></section>
    <div class="va-marks" aria-live="polite"></div>
    <footer>
      <div class="va-drawer" id="va-drawer"></div>
      <div class="va-ledge">
        <div class="va-brushes" role="group" aria-label="Brush"></div>
        <div class="va-seed"><label for="va-seed">N°</label><input id="va-seed" type="number" step="1" /><button class="va-btn" type="button" data-next>Next seed</button></div>
        <span class="va-status"></span>
        <span class="va-spacer"></span>
        <button class="va-btn" type="button" data-open>New image</button>
        <button class="va-btn" type="button" data-adv aria-expanded="false" aria-controls="va-drawer">Advanced ▴</button>
      </div>
    </footer>
  </div>`;
  const q = <T extends HTMLElement>(s: string) => root.querySelector<T>(s)!;
  const wall = q(".va-wall"),
    marks = q(".va-marks"),
    status = q(".va-status"),
    src = q(".va-src"),
    seed = q<HTMLInputElement>("#va-seed"),
    drawer = q(".va-drawer");
  const open = filePicker(session, root);
  q("[data-open]").onclick = open;
  q("[data-next]").onclick = () => session.nextSeed();
  seed.oninput = () => session.set("seed", parseInt(seed.value, 10) || 0);
  const adv = q("[data-adv]");
  adv.onclick = () => {
    const o = drawer.classList.toggle("open");
    adv.setAttribute("aria-expanded", String(o));
    adv.textContent = o ? "Advanced ▾" : "Advanced ▴";
  };

  // Brushes: real engine strokes, painted in cream on the wood.
  const brushes = q(".va-brushes");
  const brushBtns = (["dab", "curve"] as const).map((b) => {
    const el = document.createElement("button");
    el.className = "va-brush";
    el.type = "button";
    el.append(brushSwatch(b, 84, 30, [239, 230, 210]));
    const s = document.createElement("span");
    s.textContent = b === "dab" ? "Dab" : "Curved";
    el.append(s);
    el.onclick = () => session.setBrush(b);
    brushes.append(el);
    return [b, el] as const;
  });

  // Drawer.
  const size = document.createElement("div");
  size.className = "va-field";
  size.innerHTML = `<header><b>Working size</b><small>long side</small></header><div class="va-seg"></div>`;
  const seg = size.querySelector(".va-seg")!;
  const sizeBtns = SIZES.map((v) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = String(v);
    b.onclick = () => session.set("size", v);
    seg.append(b);
    return [v, b] as const;
  });
  const ground = document.createElement("div");
  ground.className = "va-field";
  ground.innerHTML = `<header><b>Ground</b><small>under the first stroke</small></header><div class="va-grounds"></div>`;
  const groundBtns = GROUNDS.map(([v, label]) => {
    const b = document.createElement("button");
    b.type = "button";
    b.innerHTML = `<i style="background:${v === "white" ? "#f6f4ef" : v === "toned" ? "#86583a" : "linear-gradient(90deg,#c9a184,#5a6e84,#d8c39a)"}"></i>${label}`;
    b.onclick = () => session.set("ground", v);
    ground.querySelector(".va-grounds")!.append(b);
    return [v, b] as const;
  });
  drawer.append(size, ground);
  const sliders = ADVANCED.map((spec) => {
    const f = document.createElement("label");
    f.className = "va-field";
    f.innerHTML = `<header><b>${spec.label}</b><output></output></header><input type="range" min="${spec.min}" max="${spec.max}" step="${spec.step}"><small>${spec.hint}</small>`;
    const inp = f.querySelector("input")!,
      out = f.querySelector("output")!;
    inp.oninput = () => session.set(spec.k, +inp.value as never);
    drawer.append(f);
    return { spec, inp, out };
  });

  // Wall: empty primed canvas, or the framed painting with a wipe.
  const empty = document.createElement("div");
  empty.className = "va-empty";
  empty.tabIndex = 0;
  empty.innerHTML = `<div><h2>Drop an image on the canvas</h2><p>or <u>choose a file</u> · it never leaves this browser</p></div>`;
  empty.onclick = open;
  const frame = document.createElement("div");
  frame.className = "va-frame";
  session.canvas.className = "va-paint";
  const wipe = document.createElement("div");
  wipe.className = "va-wipe";
  wipe.innerHTML = `<i>source</i><i>painting</i><span>⇆</span>`;
  frame.append(session.source, session.canvas, wipe);
  let cut = 0; // fraction of width showing the source
  const setCut = (f: number) => {
    cut = Math.min(1, Math.max(0, f));
    session.canvas.style.clipPath = `inset(0 0 0 ${cut * 100}%)`;
    wipe.style.left = `${cut * 100}%`;
  };
  setCut(0);
  wipe.addEventListener("pointerdown", (e) => {
    wipe.setPointerCapture(e.pointerId);
    const move = (ev: PointerEvent) => {
      const r = frame.getBoundingClientRect();
      setCut((ev.clientX - r.left) / r.width);
    };
    wipe.onpointermove = move;
    wipe.onpointerup = () => (wipe.onpointermove = null);
  });
  acceptDrops(root, session, (on) => empty.classList.toggle("hover", on));

  const render = () => {
    const s = session.settings;
    wall.replaceChildren(session.hasSource ? frame : empty);
    if (session.error) {
      const e = document.createElement("div");
      e.className = "va-err";
      e.textContent = session.error;
      wall.append(e);
    }
    src.textContent = session.sourceSize
      ? `${session.name} · ${session.sourceSize.join(" × ")} → ${session.canvas.width} × ${session.canvas.height}`
      : "";
    if (document.activeElement !== seed) seed.value = String(s.seed);
    for (const [b, el] of brushBtns) el.setAttribute("aria-pressed", String(session.brush === b));
    for (const [v, b] of sizeBtns) b.setAttribute("aria-pressed", String(s.size === v));
    for (const [v, b] of groundBtns) b.setAttribute("aria-pressed", String(s.ground === v));
    for (const { spec, inp, out } of sliders) {
      if (document.activeElement !== inp) inp.value = String(s[spec.k]);
      out.textContent = fmt(spec, s[spec.k] as number);
    }
    const p = session.progress;
    const n = p?.layers ?? s.layers;
    marks.innerHTML = "";
    if (session.hasSource)
      for (let i = 0; i < n; i++) {
        const d = document.createElement("div");
        const r = Math.max(1.5, s.maxR / 2 ** i);
        if (p && (p.done || i + 1 < p.layer)) d.className = "done";
        else if (p && i + 1 === p.layer) d.className = "now";
        d.innerHTML = `${ROMAN[i]}<small>${r} px</small>`;
        marks.append(d);
      }
    status.textContent = !session.hasSource
      ? ""
      : !p
        ? ""
        : p.done
          ? "dry."
          : p.layer === 0
            ? "priming the ground…"
            : `layer ${ROMAN[p.layer - 1]} of ${ROMAN[n - 1]}…`;
  };
  session.on(render);
  render();
}
