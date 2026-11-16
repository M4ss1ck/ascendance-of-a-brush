/* oxlint-disable -- PROTOTYPE (issue #6): throwaway code on a throwaway branch. */
/**
 * PROTOTYPE (issue #6), variant C, "Palette".
 * Full-bleed: the painting fills the dark room. Every control sits on a floating artist's
 * palette (thumb hole included): brush picks are real engine strokes in paint colors, the
 * seed is a dial. Advanced is a side sheet whose sliders have dab-shaped thumbs. Progress is
 * a single brushstroke across the top that lengthens as layers finish. Compare with the
 * source through a loupe that follows the pointer.
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

const CSS = /* css */ `
.vc{--room:#121310;--wood:#d9c3a0;--wood2:#c7ab83;--ink:#221a12;--chalk:#ece6d8;--cad:#d1452c;--ochre:#d8a23c;--sap:#4c6b3a;
  position:fixed;inset:0;background:var(--room);color:var(--chalk);overflow:hidden;
  font:500 13px/1.3 "Archivo",system-ui,sans-serif;font-stretch:80%}
.vc *{box-sizing:border-box}
.vc-stage{position:absolute;inset:0;display:grid;place-items:center;padding:64px 28px 28px 240px}
.vc-stage canvas{height:calc(100dvh - 92px);width:auto;max-width:calc(100vw - 268px);object-fit:contain;box-shadow:0 0 0 1px #ffffff10,0 40px 80px -30px #000}
.vc-wrap{position:relative;line-height:0;max-width:100%;max-height:100%;display:grid}
.vc-wrap>canvas{grid-area:1/1}
.vc-loupe{position:absolute;width:180px;height:180px;border-radius:50%;pointer-events:none;overflow:hidden;
  box-shadow:0 0 0 3px var(--chalk),0 10px 30px #000a;display:none}
.vc-loupe canvas{position:absolute;max-width:none;max-height:none;box-shadow:none;object-fit:fill}
.vc-loupe span{position:absolute;bottom:14px;left:0;right:0;text-align:center;font:700 10px/1 "Archivo";letter-spacing:.2em;color:var(--chalk);text-shadow:0 1px 3px #000}
.vc-stroke{position:absolute;top:20px;left:240px;right:24px;height:26px;display:flex;align-items:center;gap:14px}
.vc-stroke svg{flex:1;height:26px;overflow:visible}
.vc-stroke b{font:800 12px/1 "Archivo";letter-spacing:.16em;text-transform:uppercase;font-stretch:70%;white-space:nowrap;min-width:150px;text-align:right}
.vc-pal{position:absolute;left:18px;top:50%;transform:translateY(-50%);width:196px;padding:30px 20px 64px;color:var(--ink);
  background:radial-gradient(circle at 70% calc(100% - 34px),#0000 0 15px,#0002 16px,#0000 18px),
    radial-gradient(ellipse at 30% 20%,#fff3 0,#0000 60%),linear-gradient(160deg,var(--wood),var(--wood2));
  -webkit-mask:radial-gradient(circle at 70% calc(100% - 34px),#0000 0 15px,#000 16px);mask:radial-gradient(circle at 70% calc(100% - 34px),#0000 0 15px,#000 16px);
  border-radius:46px 70px 54px 38px / 40px 56px 70px 50px;display:flex;flex-direction:column;gap:14px;
  box-shadow:inset 0 2px 0 #fff6,inset 0 -3px 0 #0002;filter:drop-shadow(0 18px 30px #000c)}
.vc-pal h1{margin:0;font:800 16px/0.9 "Archivo";text-transform:uppercase;letter-spacing:.04em;font-stretch:62%}
.vc-pal h1 small{display:block;font:500 9px/1.4 "Archivo";letter-spacing:.2em;opacity:.6;margin-top:4px}
.vc-lbl{font:700 9px/1 "Archivo";letter-spacing:.22em;text-transform:uppercase;opacity:.55}
.vc-brush{all:unset;cursor:pointer;display:grid;gap:2px;border-radius:12px;padding:4px 6px;transition:background .15s}
.vc-brush span{font:700 10px/1 "Archivo";letter-spacing:.14em;text-transform:uppercase;opacity:.55}
.vc-brush[aria-pressed=true]{background:#00000014}.vc-brush[aria-pressed=true] span{opacity:1}
.vc-brush:focus-visible,.vc-tool:focus-visible,.vc-dial button:focus-visible{outline:2px solid var(--ink);outline-offset:1px}
.vc-dial{display:flex;align-items:center;justify-content:space-between;background:#00000012;border-radius:999px;padding:3px}
.vc-dial button{all:unset;cursor:pointer;width:26px;height:26px;border-radius:50%;display:grid;place-items:center;font:700 15px/1 "Archivo"}
.vc-dial button:hover{background:#0001}
.vc-dial input{all:unset;width:6ch;text-align:center;font:800 22px/1 "Archivo";font-stretch:70%;font-variant-numeric:tabular-nums}
.vc-tools{display:flex;gap:6px;flex-wrap:wrap}
.vc-tool{all:unset;cursor:pointer;font:700 10px/1 "Archivo";letter-spacing:.12em;text-transform:uppercase;padding:7px 9px;border-radius:999px;background:#00000014}
.vc-tool[aria-pressed=true]{background:var(--ink);color:var(--wood)}
.vc-sheet{position:absolute;top:0;right:0;bottom:0;width:min(340px,100vw);background:#1b1c18;border-left:1px solid #ffffff12;
  transform:translateX(100%);transition:transform .3s cubic-bezier(.2,.8,.2,1);padding:64px 22px 24px;overflow:auto;display:grid;gap:18px;align-content:start}
.vc-sheet.open{transform:none}
.vc-sheet h2{margin:0;font:800 13px/1 "Archivo";letter-spacing:.2em;text-transform:uppercase}
.vc-f{display:grid;gap:6px}
.vc-f header{display:flex;justify-content:space-between;font:700 10px/1 "Archivo";letter-spacing:.14em;text-transform:uppercase}
.vc-f header output{color:var(--ochre);font-variant-numeric:tabular-nums}
.vc-f small{opacity:.45;font-size:11px}
.vc-f input[type=range]{-webkit-appearance:none;appearance:none;width:100%;height:18px;background:transparent}
.vc-f input[type=range]::-webkit-slider-runnable-track{height:3px;border-radius:2px;background:linear-gradient(90deg,var(--ochre) var(--p,50%),#ffffff1f var(--p,50%))}
.vc-f input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:16px;height:14px;margin-top:-6px;background:var(--ochre);
  border-radius:58% 42% 55% 45% / 50% 60% 40% 50%;box-shadow:0 2px 4px #0008}
.vc-f input[type=range]::-moz-range-track{height:3px;background:#ffffff1f}
.vc-f input[type=range]::-moz-range-progress{height:3px;background:var(--ochre)}
.vc-chips{display:flex;gap:6px;flex-wrap:wrap}
.vc-chips button{all:unset;cursor:pointer;padding:6px 10px;border-radius:999px;box-shadow:inset 0 0 0 1px #ffffff26;font:700 11px/1 "Archivo";letter-spacing:.08em}
.vc-chips button[aria-pressed=true]{background:var(--chalk);color:var(--room)}
.vc-empty{width:min(100%,760px);aspect-ratio:3/2;display:grid;place-items:center;text-align:center;cursor:pointer;position:relative}
.vc-empty svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible}
.vc-empty h2{margin:0;font:800 clamp(32px,6vw,64px)/0.9 "Archivo";font-stretch:62%;text-transform:uppercase;letter-spacing:.01em}
.vc-empty p{margin:10px 0 0;opacity:.55;letter-spacing:.04em}
.vc-empty.hover path{stroke:var(--ochre)}
.vc-err{position:absolute;bottom:20px;left:240px;color:var(--cad);font-weight:700}
@media (max-width:720px){
  .vc-stage{padding:60px 12px 230px}.vc-stroke{left:16px;right:16px}
  .vc-pal{left:50%;top:auto;bottom:14px;transform:translateX(-50%);width:calc(100vw - 24px);flex-direction:row;flex-wrap:wrap;border-radius:60px 40px 50px 70px/50px 60px 40px 60px;
    -webkit-mask:none;mask:none;padding:16px 20px}
  .vc-pal h1{display:none}.vc-err{left:16px;bottom:240px}}
`;

export function mountPalette(root: HTMLElement, session: Session): void {
  const style = document.createElement("style");
  style.textContent = CSS;
  document.head.append(style);
  root.innerHTML = `
  <div class="vc">
    <section class="vc-stage"></section>
    <div class="vc-stroke" aria-live="polite"><svg viewBox="0 0 1000 26" preserveAspectRatio="none"></svg><b></b></div>
    <nav class="vc-pal" aria-label="Painting controls">
      <h1>Ascendance of a Brush<small>everything stays in this browser</small></h1>
      <div class="vc-lbl">Brush</div><div data-brushes style="display:grid;gap:4px"></div>
      <div class="vc-lbl">Seed</div>
      <div class="vc-dial"><button type="button" aria-label="Previous seed" data-prev>−</button><input aria-label="Seed" type="text" inputmode="numeric" /><button type="button" aria-label="Next seed" data-next>+</button></div>
      <div class="vc-tools"><button class="vc-tool" type="button" data-open>Image</button><button class="vc-tool" type="button" data-loupe aria-pressed="false">Loupe</button><button class="vc-tool" type="button" data-adv aria-pressed="false">Advanced</button></div>
    </nav>
    <aside class="vc-sheet" aria-label="Advanced settings"><h2>Advanced</h2></aside>
    <div class="vc-err"></div>
  </div>`;
  const q = <T extends HTMLElement>(s: string) => root.querySelector<T>(s)!;
  const stage = q(".vc-stage"),
    svg = q<SVGSVGElement & HTMLElement>(".vc-stroke svg"),
    label = q(".vc-stroke b"),
    sheet = q(".vc-sheet"),
    seed = q<HTMLInputElement>(".vc-dial input"),
    err = q(".vc-err");
  const open = filePicker(session, root);
  q("[data-open]").onclick = open;
  q("[data-next]").onclick = () => session.nextSeed();
  q("[data-prev]").onclick = () => session.set("seed", session.settings.seed - 1);
  seed.oninput = () => session.set("seed", parseInt(seed.value, 10) || 0);
  const advBtn = q("[data-adv]");
  advBtn.onclick = () =>
    advBtn.setAttribute("aria-pressed", String(sheet.classList.toggle("open")));
  let loupeOn = false;
  const loupeBtn = q("[data-loupe]");
  loupeBtn.onclick = () => loupeBtn.setAttribute("aria-pressed", String((loupeOn = !loupeOn)));

  const brushBtns = (["dab", "curve"] as const).map((b) => {
    const el = document.createElement("button");
    el.type = "button";
    el.className = "vc-brush";
    el.append(brushSwatch(b, 116, 34, b === "dab" ? [209, 69, 44] : [76, 107, 58]));
    const s = document.createElement("span");
    s.textContent = b === "dab" ? "Dab" : "Curved";
    el.append(s);
    el.onclick = () => session.setBrush(b);
    q("[data-brushes]").append(el);
    return [b, el] as const;
  });

  // Advanced sheet.
  const chips = (
    title: string,
    items: [string, string][],
    isOn: (v: string) => boolean,
    act: (v: string) => void,
  ) => {
    const f = document.createElement("div");
    f.className = "vc-f";
    f.innerHTML = `<header><span>${title}</span></header><div class="vc-chips"></div>`;
    const btns = items.map(([v, l]) => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = l;
      b.onclick = () => act(v);
      f.querySelector(".vc-chips")!.append(b);
      return () => b.setAttribute("aria-pressed", String(isOn(v)));
    });
    sheet.append(f);
    return () => btns.forEach((x) => x());
  };
  const showSize = chips(
    "Working size",
    SIZES.map((v) => [String(v), `${v}`]),
    (v) => session.settings.size === +v,
    (v) => session.set("size", +v),
  );
  const showGround = chips(
    "Ground",
    GROUNDS,
    (v) => session.settings.ground === v,
    (v) => session.set("ground", v as never),
  );
  const sliders = ADVANCED.map((spec) => {
    const f = document.createElement("label");
    f.className = "vc-f";
    f.innerHTML = `<header><span>${spec.label}</span><output></output></header><input type="range" min="${spec.min}" max="${spec.max}" step="${spec.step}"><small>${spec.hint}</small>`;
    const inp = f.querySelector("input")!;
    inp.oninput = () => session.set(spec.k, +inp.value as never);
    sheet.append(f);
    return { spec, inp, out: f.querySelector("output")! };
  });

  // Stage.
  const empty = document.createElement("div");
  empty.className = "vc-empty";
  empty.tabIndex = 0;
  empty.innerHTML = `<svg viewBox="0 0 300 200" preserveAspectRatio="none" aria-hidden="true"><path d="M6 8 Q150 2 294 9 Q298 100 292 193 Q150 198 8 191 Q3 100 6 8Z" fill="none" stroke="#ece6d855" stroke-width="2.2" stroke-dasharray="10 7" vector-effect="non-scaling-stroke" stroke-linecap="round"/></svg>
    <div><h2>Drop an image</h2><p>or press <b>Image</b> on the palette</p></div>`;
  empty.onclick = open;
  acceptDrops(root, session, (on) => empty.classList.toggle("hover", on));
  const wrap = document.createElement("div");
  wrap.className = "vc-wrap";
  const loupe = document.createElement("div");
  loupe.className = "vc-loupe";
  const lc = document.createElement("canvas");
  loupe.append(lc, Object.assign(document.createElement("span"), { textContent: "SOURCE" }));
  wrap.append(session.canvas, loupe);
  wrap.addEventListener("pointermove", (e) => {
    if (!loupeOn) return void (loupe.style.display = "none");
    const r = session.canvas.getBoundingClientRect();
    const x = e.clientX - r.left,
      y = e.clientY - r.top;
    loupe.style.display = "block";
    loupe.style.left = `${x - 90}px`;
    loupe.style.top = `${y - 90}px`;
    if (lc.width !== session.source.width) {
      lc.width = session.source.width;
      lc.height = session.source.height;
    }
    lc.getContext("2d")!.drawImage(session.source, 0, 0);
    lc.style.width = `${r.width}px`;
    lc.style.height = `${r.height}px`;
    lc.style.left = `${90 - x}px`;
    lc.style.top = `${90 - y}px`;
  });
  wrap.addEventListener("pointerleave", () => (loupe.style.display = "none"));

  // Progress stroke: a wavering band split into one segment per layer.
  const strokePath = (t: number) => {
    const pts: string[] = [];
    for (let i = 0; i <= 50; i++) {
      const x = i * 20,
        y = 13 + Math.sin(i * 0.7) * 2.2 + Math.sin(i * 1.9) * 1.1;
      pts.push(`${i ? "L" : "M"}${x} ${y.toFixed(1)}`);
    }
    return { d: pts.join(""), t };
  };
  const base = strokePath(0).d;
  svg.innerHTML = `<path d="${base}" fill="none" stroke="#ffffff14" stroke-width="10" stroke-linecap="round"/>
    <path data-p d="${base}" fill="none" stroke="var(--ochre)" stroke-width="9" stroke-linecap="round" pathLength="1000" stroke-dasharray="0 1000" style="transition:stroke-dasharray .25s"/>
    <path data-p2 d="${base}" fill="none" stroke="#fff4" stroke-width="1.2" pathLength="1000" stroke-dasharray="0 1000" transform="translate(0 -2.5)"/>`;
  const pth = svg.querySelector<SVGPathElement>("[data-p]")!,
    pth2 = svg.querySelector<SVGPathElement>("[data-p2]")!;

  const render = () => {
    const s = session.settings;
    err.textContent = session.error;
    stage.replaceChildren(session.hasSource ? wrap : empty);
    if (document.activeElement !== seed) seed.value = String(s.seed);
    for (const [b, el] of brushBtns) el.setAttribute("aria-pressed", String(session.brush === b));
    showSize();
    showGround();
    for (const { spec, inp, out } of sliders) {
      if (document.activeElement !== inp) inp.value = String(s[spec.k]);
      out.textContent = fmt(spec, s[spec.k] as number);
      inp.style.setProperty(
        "--p",
        `${(((s[spec.k] as number) - spec.min) / (spec.max - spec.min)) * 100}%`,
      );
    }
    const p = session.progress;
    const frac = !p ? 0 : p.done ? 1 : Math.max(0.02, (p.layer - 0.5) / p.layers);
    const da = `${Math.round(frac * 1000)} 1000`;
    pth.setAttribute("stroke-dasharray", da);
    pth2.setAttribute("stroke-dasharray", da);
    svg.style.visibility = session.hasSource ? "visible" : "hidden";
    label.textContent =
      !session.hasSource || !p
        ? ""
        : p.done
          ? `${session.canvas.width}×${session.canvas.height} · done`
          : p.layer === 0
            ? "Ground"
            : `Layer ${p.layer}/${p.layers} · ${p.radius}px`;
  };
  session.on(render);
  render();
}
