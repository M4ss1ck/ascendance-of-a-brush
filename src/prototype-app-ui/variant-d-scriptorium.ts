/* oxlint-disable -- PROTOTYPE (issue #6): throwaway code on a throwaway branch. */
/**
 * PROTOTYPE (issue #6), variant D, "Scriptorium": variant A's layout (painting on a wall,
 * tool ledge, drawer, wipe) re-themed after the user's favourite series about books and
 * printing. The mood only: deep blue bookcloth wall in the heroine's hair blue, gilt tooling,
 * parchment, a wax seal. No names, characters, logos or art from the series.
 *
 * Brush picks are tiny finished paintings made by the real engine (of the user's own image
 * once there is one), so each shows a result, not an isolated stroke. Progress is a strip of
 * per-layer "pages". The painting scales to fit both ways (Q14). Phones get a fixed ledge and
 * a full-height drawer (Q16). Fonts: Mononoki everywhere, Metal for the few small labels.
 */
import "@fontsource/mononoki/400.css";
import "@fontsource/mononoki/700.css";
import "@fontsource/metal/400.css";
import { drawStroke, type BrushName, type Point } from "../engine/brushes.ts";
import type { RGB } from "../engine/color.ts";
import { rngFrom } from "../engine/prng.ts";
import { ADVANCED, GROUNDS, SIZES, acceptDrops, filePicker, fmt, type Session } from "./session.ts";

const ROMAN = ["I", "II", "III", "IV", "V"];

const CSS = /* css */ `
.vd{--myne:#2c4a8f;--myne-d:#1b2d5c;--myne-dd:#121e40;--myne-l:#5f7fc4;--gold:#c9a24a;--gold-l:#e8cf88;
  --vellum:#f2e8cf;--vellum-d:#e2d3ad;--ink:#22190f;--sepia:#6b5636;--wax:#2c4a8f;
  min-height:100dvh;display:grid;grid-template-rows:auto 1fr auto auto;color:var(--vellum);
  font:14px/1.4 "Mononoki",ui-monospace,monospace;
  background:
    radial-gradient(120% 90% at 50% 40%,#0000 40%,#0a1230aa),
    repeating-linear-gradient(0deg,#ffffff07 0 1px,#0000 1px 3px),
    repeating-linear-gradient(90deg,#00000014 0 1px,#0000 1px 3px),
    var(--myne-d)}
.vd *{box-sizing:border-box}
.vd-top{display:flex;justify-content:space-between;align-items:center;padding:16px 28px 0;gap:16px}
.vd-mark{display:flex;align-items:center;gap:10px;font:700 20px/1 "Mononoki",ui-monospace,monospace;letter-spacing:-.01em}
.vd-mark i{display:grid;place-items:center;width:40px;height:40px;font:700 26px/1 "Mononoki",ui-monospace,monospace;color:var(--gold-l);
  background:var(--myne);box-shadow:inset 0 0 0 1px var(--gold),inset 0 0 0 4px var(--myne),inset 0 0 0 5px #c9a24a88}
.vd-mark small{display:block;font:italic 13px/1.2 "Mononoki",ui-monospace,monospace;opacity:.65;margin-top:3px}
.vd-src{font:14px/1.2 "Metal",serif;opacity:.7;text-align:right;letter-spacing:.04em}
.vd-wall{display:grid;place-items:center;padding:20px 16px 6px;min-height:0}
.vd-frame{position:relative;line-height:0;padding:12px;background:var(--myne-dd);
  box-shadow:inset 0 0 0 1px var(--gold),inset 0 0 0 5px var(--myne-dd),inset 0 0 0 6px #c9a24a99,0 30px 60px -24px #000d,0 0 0 1px #0008}
.vd-frame canvas{display:block}
.vd-frame .vd-paint{position:absolute;left:12px;top:12px}
.vd-orn{position:absolute;width:14px;height:14px;color:var(--gold)}
.vd-orn.tl{left:-7px;top:-7px}.vd-orn.tr{right:-7px;top:-7px}.vd-orn.bl{left:-7px;bottom:-7px}.vd-orn.br{right:-7px;bottom:-7px}
.vd-wipe{position:absolute;top:2px;bottom:2px;width:0;border-left:1.5px solid var(--gold-l);cursor:ew-resize;touch-action:none}
.vd-wipe span{position:absolute;bottom:-14px;left:-13px;width:26px;height:38px;background:var(--myne);color:var(--gold-l);
  clip-path:polygon(0 0,100% 0,100% 100%,50% 78%,0 100%);display:grid;place-items:start center;padding-top:7px;font-size:12px;box-shadow:inset 0 0 0 1px var(--gold)}
.vd-wipe i{position:absolute;top:10px;font:14px/1 "Metal",serif;color:var(--vellum);text-shadow:0 1px 3px #000c;white-space:nowrap;pointer-events:none}
.vd-wipe i:first-child{right:8px}.vd-wipe i+i{left:8px}
.vd-empty{position:relative;display:grid;place-items:center;text-align:center;color:var(--sepia);cursor:pointer;
  width:min(80vw,620px);aspect-ratio:4/3;background:radial-gradient(90% 80% at 50% 45%,var(--vellum),var(--vellum-d));
  box-shadow:inset 0 0 0 1px var(--gold),inset 0 0 0 10px var(--vellum),inset 0 0 0 11px #c9a24a88,0 30px 60px -24px #000d;transition:box-shadow .2s}
.vd-empty.hover{box-shadow:inset 0 0 0 1px var(--gold),inset 0 0 0 10px var(--vellum),inset 0 0 0 13px var(--myne),0 30px 60px -24px #000d}
.vd-empty h2{margin:0 0 8px;font:700 26px/1.1 "Mononoki",ui-monospace,monospace;color:var(--myne-d)}
.vd-empty h2 b{font:normal 64px/0.8 "Mononoki",ui-monospace,monospace;color:var(--myne);float:left;margin:2px 6px 0 0}
.vd-empty p{margin:0;font-size:15px}
.vd-empty u{text-decoration-color:var(--myne);text-underline-offset:3px}
.vd-err{color:#ffb4a0;text-align:center;font-style:italic;padding:6px}
.vd-pages{display:flex;justify-content:center;gap:10px;padding:10px 16px 14px;flex-wrap:wrap;min-height:84px}
.vd-page{all:unset;cursor:pointer;display:grid;justify-items:center;gap:4px;font:13px/1 "Mononoki",ui-monospace,monospace;letter-spacing:.04em;opacity:.45;transition:opacity .3s}
.vd-page canvas,.vd-page i{display:block;height:48px;width:auto;box-shadow:0 0 0 1px #c9a24a66,0 4px 10px #0006}
.vd-page i{width:64px;background:repeating-linear-gradient(0deg,#ffffff0a 0 1px,#0000 1px 4px),var(--myne-dd)}
.vd-page small{font:12px/1 "Metal",serif;opacity:.7;letter-spacing:0}
.vd-page.done{opacity:1}.vd-page:hover canvas,.vd-page:focus-visible canvas{box-shadow:0 0 0 2px var(--gold-l),0 4px 10px #0006}
.vd-tag{position:absolute;left:24px;top:22px;font:14px/1 "Metal",serif;color:var(--gold-l);background:#121e40cc;padding:5px 8px}.vd-page.now{opacity:1;color:var(--gold-l)}
.vd-page.now i{animation:vd-g 1s ease-in-out infinite alternate}
@keyframes vd-g{to{box-shadow:0 0 0 1px var(--gold),0 0 14px #c9a24a66}}
.vd-ledge{position:relative;display:flex;align-items:center;gap:22px;padding:18px 28px 16px;flex-wrap:wrap;color:var(--ink);
  background:radial-gradient(60% 140% at 20% 0%,#fff6 0,#0000 60%),radial-gradient(30% 90% at 85% 100%,#a07a3a22,#0000),var(--vellum);
  box-shadow:0 -1px 0 var(--gold),0 -4px 0 var(--myne-dd),0 -5px 0 #c9a24a88,0 -18px 30px -12px #000a}
.vd-ledge::before{content:"";position:absolute;inset:0;pointer-events:none;opacity:.5;
  background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='3'/%3E%3CfeColorMatrix values='0 0 0 0 .45 0 0 0 0 .33 0 0 0 0 .15 0 0 0 .18 0'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)'/%3E%3C/svg%3E")}
.vd-group{position:relative;display:flex;align-items:center;gap:12px}
.vd-lbl{font:14px/1.2 "Metal",serif;letter-spacing:.06em;color:var(--sepia)}
.vd-brush{all:unset;cursor:pointer;position:relative;display:grid;justify-items:center;gap:5px;padding:4px;font:italic 16px/1 "Mononoki",ui-monospace,monospace}
.vd-brush canvas{display:block;box-shadow:0 0 0 1px #6b563655,0 3px 6px #0003;transition:transform .15s}
.vd-brush[aria-pressed=true] canvas{box-shadow:0 0 0 1px var(--gold),0 0 0 3px var(--myne),0 4px 10px #0004;transform:translateY(-2px)}
.vd-brush[aria-pressed=true]::after{content:"";position:absolute;top:-18px;right:10px;width:10px;height:26px;background:var(--myne);
  clip-path:polygon(0 0,100% 0,100% 100%,50% 75%,0 100%)}
.vd-brush[aria-pressed=true] span{color:var(--myne)}
.vd-brush:focus-visible,.vd-btn:focus-visible,.vd-seal:focus-within{outline:2px solid var(--myne);outline-offset:3px}
.vd-seal{position:relative;width:62px;height:62px;display:grid;place-items:center;
  background:radial-gradient(circle at 38% 32%,#5f7fc4,var(--wax) 45%,#1b2d5c 100%);
  border-radius:52% 48% 50% 50% / 48% 52% 49% 51%;box-shadow:0 0 0 3px #2c4a8f55,0 3px 6px #0005,inset 0 -3px 6px #0005}
.vd-seal::before{content:"";position:absolute;inset:8px;border-radius:50%;box-shadow:inset 0 0 0 1px #ffffff40,inset 0 1px 2px #0006}
.vd-seal input{all:unset;width:46px;text-align:center;font:24px/1 "Mononoki",ui-monospace,monospace;color:var(--gold-l);text-shadow:0 1px 0 #0008;position:relative}
.vd-btn{all:unset;cursor:pointer;font:700 14px/1 "Mononoki",ui-monospace,monospace;color:var(--myne-d);padding:6px 2px;border-bottom:1px solid #2c4a8f66}
.vd-btn:hover{border-bottom-color:var(--myne)}
.vd-band{width:1px;align-self:stretch;background:linear-gradient(#0000,#6b563655,#0000)}
.vd-spacer{flex:1}
.vd-status{font:italic 16px/1.2 "Mononoki",ui-monospace,monospace;color:var(--sepia);min-width:130px}
.vd-drawer{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:18px 30px;padding:0 28px;max-height:0;overflow:hidden;color:var(--ink);
  background:var(--vellum-d);transition:max-height .35s ease,padding .35s ease}
.vd-drawer.open{max-height:min(540px,40dvh);padding:22px 28px 24px;overflow:auto}
.vd-drawer h3{grid-column:1/-1;margin:0;font:20px/1 "Mononoki",ui-monospace,monospace;display:flex;align-items:center;gap:12px}
.vd-drawer h3::after{content:"";flex:1;height:1px;background:linear-gradient(90deg,var(--gold),#0000)}
.vd-drawer h3 button{display:none}
.vd-field{display:grid;gap:6px}
.vd-field header{display:flex;justify-content:space-between;align-items:baseline}
.vd-field b{font:700 14px/1 "Mononoki",ui-monospace,monospace}
.vd-field output{font:14px/1 "Mononoki",ui-monospace,monospace;color:var(--myne);font-variant-numeric:tabular-nums}
.vd-field small{font-size:12px;color:var(--sepia)}
.vd-field input[type=range]{-webkit-appearance:none;appearance:none;width:100%;height:20px;background:transparent}
.vd-field input[type=range]::-webkit-slider-runnable-track{height:2px;background:linear-gradient(90deg,var(--myne) var(--p,50%),#6b563640 var(--p,50%))}
.vd-field input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:12px;height:12px;margin-top:-5px;background:var(--gold);transform:rotate(45deg);box-shadow:0 0 0 1px var(--myne-d)}
.vd-seg{display:flex;gap:4px}
.vd-seg button{all:unset;cursor:pointer;flex:1;text-align:center;padding:6px 0;font:15px/1 "Mononoki",ui-monospace,monospace;box-shadow:inset 0 0 0 1px #6b563655}
.vd-seg button[aria-pressed=true]{background:var(--myne);color:var(--vellum);box-shadow:inset 0 0 0 1px var(--gold)}
.vd-grounds{display:flex;gap:10px}
.vd-grounds button{all:unset;cursor:pointer;display:grid;gap:5px;justify-items:center;font:italic 14px/1 "Mononoki",ui-monospace,monospace}
.vd-grounds i{width:48px;height:32px;box-shadow:0 0 0 1px #6b563655}
.vd-grounds button[aria-pressed=true] i{box-shadow:0 0 0 1px var(--gold),0 0 0 3px var(--myne)}
@media (max-width:640px){
  .vd{padding-bottom:150px}
  .vd-top{padding:12px 16px 0}.vd-mark{font-size:19px}.vd-mark small,.vd-src,.vd-status,.vd-band{display:none}
  .vd-ledge{position:fixed;left:0;right:0;bottom:0;z-index:10;gap:12px 14px;padding:14px 16px calc(12px + env(safe-area-inset-bottom))}
  .vd-brush canvas{height:40px}.vd-seal{width:50px;height:50px}.vd-seal input{font-size:20px}
  .vd-drawer{position:fixed;inset:0;z-index:20;max-height:none;padding:20px 16px 40px;transform:translateY(100%);transition:transform .3s ease;overflow:auto;grid-template-columns:1fr}
  .vd-drawer.open{transform:none;max-height:none;padding:20px 16px 40px}
  .vd-drawer h3 button{display:inline;margin-left:auto}
  .vd-pages{min-height:0}
}
`;

const ORN = `<svg viewBox="0 0 14 14" aria-hidden="true"><path d="M7 0 L9 5 L14 7 L9 9 L7 14 L5 9 L0 7 L5 5Z" fill="currentColor"/></svg>`;

/**
 * A brush pick: a rectangle filled edge to edge with that brush's strokes, drawn by the real
 * `drawStroke`, coarse layer then fine, in tones of the theme blue. Deterministic (fixed salt).
 */
function brushSwatchRect(brush: BrushName, W: number, H: number): HTMLCanvasElement {
  const dpr = 2;
  const cv = document.createElement("canvas");
  cv.width = W * dpr;
  cv.height = H * dpr;
  cv.style.width = `${W}px`;
  cv.style.height = `${H}px`;
  const ctx = cv.getContext("2d")!;
  ctx.scale(dpr, dpr);
  ctx.beginPath();
  ctx.rect(0, 0, W, H);
  ctx.clip();
  const rng = rngFrom(17, brush === "dab" ? 1 : 2);
  const tone = (): RGB => {
    const k = 0.55 + rng() * 0.95;
    return [Math.min(255, 44 * k + 18), Math.min(255, 74 * k + 10), Math.min(255, 143 * k)];
  };
  // Flow for curved strokes: a gentle diagonal wave across the swatch.
  const angle = (x: number, y: number) => -0.35 + 0.55 * Math.sin(x * 0.07 + y * 0.05);
  for (const R of [9, 4.5]) {
    const grid = Math.max(2, Math.round(R));
    for (let gy = -grid; gy < H + grid; gy += grid)
      for (let gx = -grid; gx < W + grid; gx += grid) {
        if (R < 9 && rng() < 0.45) continue;
        const x = gx + (rng() - 0.5) * grid,
          y = gy + (rng() - 0.5) * grid;
        if (brush === "dab") {
          drawStroke(ctx, { b: "dab", x, y, r: R, c: tone(), a: 0.9 });
        } else {
          const pts: Point[] = [[x, y]];
          for (let i = 0; i < 6; i++) {
            const [px, py] = pts.at(-1)!;
            const t = angle(px, py);
            pts.push([px + Math.cos(t) * R * 0.9, py + Math.sin(t) * R * 0.9]);
          }
          drawStroke(ctx, {
            b: "curve",
            pts,
            w: R * 1.6,
            c: tone(),
            a: 0.9,
            seed: (rng() * 1e9) | 0,
          });
        }
      }
  }
  ctx.globalAlpha = 1;
  return cv;
}

export function mountScriptorium(root: HTMLElement, session: Session): void {
  const style = document.createElement("style");
  style.textContent = CSS;
  document.head.append(style);
  root.innerHTML = `
  <div class="vd">
    <header class="vd-top">
      <div class="vd-mark"><div>Ascendance of a Brush</div></div>
      <div class="vd-src"></div>
    </header>
    <section class="vd-wall"></section>
    <div class="vd-pages" aria-live="polite"></div>
    <footer>
      <div class="vd-drawer" id="vd-drawer" role="region" aria-label="Advanced settings"><h3>Advanced <button class="vd-btn" type="button" data-close>Close</button></h3></div>
      <div class="vd-ledge">
        <div class="vd-group" role="group" aria-label="Brush"><span class="vd-lbl">Brush</span><div data-brushes style="display:flex;gap:10px"></div></div>
        <span class="vd-band"></span>
        <div class="vd-group"><span class="vd-lbl">Seed</span><label class="vd-seal"><input aria-label="Seed" type="text" inputmode="numeric" /></label><button class="vd-btn" type="button" data-next>Another</button></div>
        <span class="vd-band"></span>
        <span class="vd-status"></span>
        <span class="vd-spacer"></span>
        <button class="vd-btn" type="button" data-open>New image</button>
        <button class="vd-btn" type="button" data-adv aria-expanded="false" aria-controls="vd-drawer">Advanced</button>
      </div>
    </footer>
  </div>`;
  const q = <T extends HTMLElement>(s: string) => root.querySelector<T>(s)!;
  const wall = q(".vd-wall"),
    pages = q(".vd-pages"),
    status = q(".vd-status"),
    src = q(".vd-src"),
    seed = q<HTMLInputElement>(".vd-seal input"),
    drawer = q(".vd-drawer");
  const open = filePicker(session, root);
  q("[data-open]").onclick = open;
  q("[data-next]").onclick = () => session.nextSeed();
  seed.oninput = () => session.set("seed", parseInt(seed.value, 10) || 0);
  const adv = q("[data-adv]");
  const setDrawer = (o: boolean) => {
    drawer.classList.toggle("open", o);
    adv.setAttribute("aria-expanded", String(o));
  };
  adv.onclick = () => setDrawer(!drawer.classList.contains("open"));
  drawer.addEventListener("transitionend", () => fit());
  q("[data-close]").onclick = () => setDrawer(false);

  // Brush picks: swatches filled with strokes.
  const brushHost = q("[data-brushes]");
  const brushBtns = (["dab", "curve"] as const).map((b) => {
    const el = document.createElement("button");
    el.className = "vd-brush";
    el.type = "button";
    const label = document.createElement("span");
    label.textContent = b === "dab" ? "Dab" : "Curved";
    el.append(brushSwatchRect(b, 92, 58), label);
    el.onclick = () => session.setBrush(b);
    brushHost.append(el);
    return [b, el] as const;
  });
  // Drawer contents.
  const size = document.createElement("div");
  size.className = "vd-field";
  size.innerHTML = `<header><b>Working size</b></header><div class="vd-seg"></div>`;
  const sizeBtns = SIZES.map((v) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = String(v);
    b.onclick = () => session.set("size", v);
    size.querySelector(".vd-seg")!.append(b);
    return [v, b] as const;
  });
  const ground = document.createElement("div");
  ground.className = "vd-field";
  ground.innerHTML = `<header><b>Ground</b></header><div class="vd-grounds"></div>`;
  const groundBtns = GROUNDS.map(([v, label]) => {
    const b = document.createElement("button");
    b.type = "button";
    b.innerHTML = `<i style="background:${v === "white" ? "#f6f4ef" : v === "toned" ? "#86583a" : "linear-gradient(90deg,#c9a184,#5a6e84,#d8c39a)"}"></i>${label}`;
    b.onclick = () => session.set("ground", v);
    ground.querySelector(".vd-grounds")!.append(b);
    return [v, b] as const;
  });
  drawer.append(size, ground);
  const sliders = ADVANCED.map((spec) => {
    const f = document.createElement("label");
    f.className = "vd-field";
    f.innerHTML = `<header><b>${spec.label}</b><output></output></header><input type="range" min="${spec.min}" max="${spec.max}" step="${spec.step}">`;
    const inp = f.querySelector("input")!;
    inp.oninput = () => session.set(spec.k, +inp.value as never);
    drawer.append(f);
    return { spec, inp, out: f.querySelector("output")! };
  });

  // Wall.
  const empty = document.createElement("div");
  empty.className = "vd-empty";
  empty.tabIndex = 0;
  empty.innerHTML = `<div><h2>Drop an image here</h2><p>or <u>choose a file</u></p></div>`;
  empty.onclick = open;
  const frame = document.createElement("div");
  frame.className = "vd-frame";
  session.canvas.className = "vd-paint";
  const wipe = document.createElement("div");
  wipe.className = "vd-wipe";
  wipe.innerHTML = `<i>source</i><i>painting</i><span aria-hidden="true">⇆</span>`;
  // Hovering a layer page shows that layer's state on the painting (variant B's reveal).
  const over = document.createElement("canvas");
  over.className = "vd-paint vd-over";
  over.hidden = true;
  const overTag = document.createElement("span");
  overTag.className = "vd-tag";
  overTag.hidden = true;
  const peek = (c: HTMLCanvasElement | null, i: number) => {
    over.hidden = overTag.hidden = !c;
    wipe.hidden = !!c;
    if (!c) return;
    over.width = c.width;
    over.height = c.height;
    over.style.width = session.canvas.style.width;
    over.style.height = session.canvas.style.height;
    over.getContext("2d")!.drawImage(c, 0, 0);
    overTag.textContent = `after layer ${ROMAN[i]}`;
  };
  frame.append(session.source, session.canvas, over, overTag, wipe);
  frame.insertAdjacentHTML(
    "beforeend",
    ["tl", "tr", "bl", "br"].map((c) => `<span class="vd-orn ${c}">${ORN}</span>`).join(""),
  );
  let cut = 0;
  const setCut = (f: number) => {
    cut = Math.min(1, Math.max(0, f));
    session.canvas.style.clipPath = `inset(0 0 0 ${cut * 100}%)`;
    wipe.style.left = `calc(12px + ${cut} * (100% - 24px))`;
  };
  setCut(0);
  wipe.addEventListener("pointerdown", (e) => {
    wipe.setPointerCapture(e.pointerId);
    wipe.onpointermove = (ev) => {
      const r = session.source.getBoundingClientRect();
      setCut((ev.clientX - r.left) / r.width);
    };
    wipe.onpointerup = () => (wipe.onpointermove = null);
  });
  acceptDrops(root, session, (on) => empty.classList.toggle("hover", on));

  /** Q14: fit the painting to the free space, scaling up or down. */
  const fit = () => {
    const W = session.source.width,
      H = session.source.height;
    if (!W || !H) return;
    const phone = innerWidth <= 640;
    // Everything that is not the wall: header, layer pages, ledge and the drawer if docked.
    const chrome =
      q(".vd-top").offsetHeight +
      Math.max(84, pages.offsetHeight) +
      q(".vd-ledge").offsetHeight +
      (phone ? 0 : drawer.offsetHeight);
    const availW = innerWidth - (phone ? 32 : 80) - 24;
    const availH = innerHeight - chrome - 26 - 24;
    const k = Math.max(0.1, Math.min(availW / W, availH / H));
    for (const c of [session.source, session.canvas]) {
      c.style.width = `${Math.round(W * k)}px`;
      c.style.height = `${Math.round(H * k)}px`;
    }
  };
  addEventListener("resize", fit);

  let pageKey = "";
  const render = () => {
    const s = session.settings;
    wall.replaceChildren(session.hasSource ? frame : empty);
    if (session.error) {
      const e = document.createElement("div");
      e.className = "vd-err";
      e.textContent = session.error;
      wall.append(e);
    }
    fit();
    src.textContent = session.sourceSize
      ? `${session.name} · ${session.canvas.width} × ${session.canvas.height}`
      : "";
    if (document.activeElement !== seed) seed.value = String(s.seed);
    for (const [b, el] of brushBtns) el.setAttribute("aria-pressed", String(session.brush === b));
    for (const [v, b] of sizeBtns) b.setAttribute("aria-pressed", String(s.size === v));
    for (const [v, b] of groundBtns) b.setAttribute("aria-pressed", String(s.ground === v));
    for (const { spec, inp, out } of sliders) {
      if (document.activeElement !== inp) inp.value = String(s[spec.k]);
      out.textContent = fmt(spec, s[spec.k] as number);
      inp.style.setProperty(
        "--p",
        `${(((s[spec.k] as number) - spec.min) / (spec.max - spec.min)) * 100}%`,
      );
    }
    const p = session.progress;
    const n = p?.layers ?? s.layers;
    status.textContent =
      !session.hasSource || !p
        ? ""
        : p.done
          ? "Finished."
          : p.layer === 0
            ? "Laying the ground…"
            : `Layer ${ROMAN[p.layer - 1]} of ${ROMAN[n - 1]}…`;
    const key = `${session.hasSource}|${session.snapshots.length}|${n}|${p?.layer}|${p?.done}`;
    if (key === pageKey) return;
    pageKey = key;
    pages.replaceChildren();
    if (!session.hasSource) return;
    for (let i = 0; i < n; i++) {
      const d = document.createElement("button");
      d.type = "button";
      d.className =
        "vd-page" +
        (p && (p.done || i + 1 < p.layer) ? " done" : p && i + 1 === p.layer ? " now" : "");
      const snap = session.snapshots[i];
      if (snap) {
        const th = document.createElement("canvas");
        th.height = 96;
        th.width = Math.round((96 * snap.width) / snap.height);
        th.getContext("2d")!.drawImage(snap, 0, 0, th.width, th.height);
        d.append(th);
        d.onpointerenter = d.onfocus = () => peek(snap, i);
        d.onpointerleave = d.onblur = () => peek(null, i);
      } else d.append(document.createElement("i"));
      d.insertAdjacentHTML(
        "beforeend",
        `${ROMAN[i]}<small>${Math.max(1.5, s.maxR / 2 ** i)} px</small>`,
      );
      pages.append(d);
    }
  };
  session.on(render);
  render();
}
