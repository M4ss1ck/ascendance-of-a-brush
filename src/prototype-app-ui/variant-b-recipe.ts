/* oxlint-disable -- PROTOTYPE (issue #6): throwaway code on a throwaway branch. */
/**
 * PROTOTYPE (issue #6), variant B, "Recipe".
 * A printed plate on laid paper. The settings are a sentence you edit in place ("Paint
 * this with a curved brush, seed 7"); Advanced is the rest of the recipe, folded away.
 * Numbers scrub by dragging sideways. Progress is a contact strip of each finished layer,
 * with the source as frame 0: hover any frame to see it on the plate.
 */
import {
  ADVANCED,
  GROUNDS,
  SIZES,
  acceptDrops,
  filePicker,
  fmt,
  type Session,
  type Settings,
  type SliderSpec,
} from "./session.ts";

const ROMAN = ["I", "II", "III", "IV", "V"];

const CSS = /* css */ `
.vb{--paper:#f1ebde;--paper2:#e7dfcd;--ink:#1d1a16;--soft:#6d6457;--red:#b2341f;--rule:#d8cfbb;
  min-height:100dvh;color:var(--ink);font:17px/1.55 "Newsreader",Georgia,serif;font-optical-sizing:auto;
  background:var(--paper) repeating-linear-gradient(90deg,#0000 0 5px,#8a7a5a08 5px 6px);
  display:grid;grid-template-columns:minmax(300px,420px) 1fr;gap:0 56px;padding:40px clamp(16px,4vw,56px) 80px}
.vb *{box-sizing:border-box}
.vb-col{display:flex;flex-direction:column;gap:22px}
.vb h1{font:500 italic 44px/0.95 "Newsreader",serif;letter-spacing:-.02em;margin:0}
.vb h1 svg{display:block;width:210px;height:14px;margin-top:6px}
.vb-kicker{font:600 11px/1 "IBM Plex Mono",monospace;letter-spacing:.14em;text-transform:uppercase;color:var(--soft)}
.vb-recipe{font-size:24px;line-height:1.5;margin:0;text-wrap:pretty}
.vb-adv p{font-size:18px;line-height:1.75;margin:0 0 10px;text-wrap:pretty}
.vb-v{all:unset;field-sizing:content;min-width:1ch;cursor:ew-resize;color:var(--red);border-bottom:1.5px solid currentColor;font-variant-numeric:tabular-nums;padding:0 2px;white-space:nowrap;touch-action:none}
.vb-v:focus{outline:2px solid #b2341f40;outline-offset:2px;cursor:text}
.vb-v[type=number]{width:auto}
.vb-pick{all:unset;cursor:pointer;color:var(--red);border-bottom:1.5px dotted currentColor;white-space:nowrap}
.vb-pick:focus-visible,.vb-link:focus-visible{outline:2px solid #b2341f60;outline-offset:2px}
.vb-pick[aria-pressed=false]{color:var(--soft);border-bottom-color:#0000;text-decoration:line-through;text-decoration-thickness:1px}
.vb-link{all:unset;cursor:pointer;font:600 11px/1 "IBM Plex Mono",monospace;letter-spacing:.12em;text-transform:uppercase;color:var(--soft);border-bottom:1px solid var(--rule);padding-bottom:3px}
.vb-link:hover{color:var(--ink)}
.vb-adv{border-top:1px solid var(--rule);padding-top:14px}
.vb-adv summary{cursor:pointer;list-style:none;font:600 11px/1 "IBM Plex Mono",monospace;letter-spacing:.14em;text-transform:uppercase;color:var(--soft)}
.vb-adv summary::before{content:"+ ";}
.vb-adv[open] summary::before{content:"− ";}
.vb-adv[open] summary{margin-bottom:14px}
.vb-note{font-size:13px;color:var(--soft);font-style:italic}
.vb-plate{display:flex;flex-direction:column;gap:14px;align-items:flex-start;min-width:0}
.vb-sheet{position:relative;background:#fbf8f1;padding:18px;box-shadow:0 1px 0 #fff inset,0 1px 2px #0000001a,0 18px 40px -24px #3a2a1066;line-height:0}
.vb-sheet canvas{max-width:100%;max-height:calc(100dvh - 260px);width:auto;height:auto}
.vb-sheet .vb-over{position:absolute;inset:18px;width:calc(100% - 36px);height:calc(100% - 36px);max-height:none}
.vb-cap{font:13px/1.4 "IBM Plex Mono",monospace;color:var(--soft);letter-spacing:.02em}
.vb-cap b{font:italic 500 16px/1 "Newsreader",serif;color:var(--ink);letter-spacing:0}
.vb-strip{display:flex;gap:10px;flex-wrap:wrap}
.vb-frame{all:unset;cursor:pointer;display:grid;gap:4px;font:11px/1 "IBM Plex Mono",monospace;color:var(--soft)}
.vb-frame canvas,.vb-frame i{display:block;width:84px;height:62px;object-fit:cover;background:var(--paper2);box-shadow:0 0 0 1px var(--rule)}
.vb-frame i{background:repeating-linear-gradient(45deg,#0000 0 4px,#00000008 4px 5px),var(--paper2)}
.vb-frame.now i{animation:vb-b 1.2s ease-in-out infinite alternate}
@keyframes vb-b{to{background-color:#dccfae}}
.vb-frame:hover canvas,.vb-frame:focus-visible canvas{box-shadow:0 0 0 2px var(--red)}
.vb-empty{width:min(100%,720px);aspect-ratio:4/3;display:grid;place-items:center;text-align:center;cursor:pointer;
  border:1.5px dashed #bfb399;color:var(--soft);transition:background .2s}
.vb-empty.hover{background:#e9dfc6;border-color:var(--red)}
.vb-empty em{display:block;font-size:30px;color:var(--ink)}
.vb-err{color:var(--red);font-style:italic}
@media (max-width:860px){.vb{grid-template-columns:1fr;gap:28px;padding-top:24px}.vb-recipe{font-size:21px}}
`;

export function mountRecipe(root: HTMLElement, session: Session): void {
  const style = document.createElement("style");
  style.textContent = CSS;
  document.head.append(style);
  root.innerHTML = `
  <main class="vb">
    <div class="vb-col">
      <div>
        <div class="vb-kicker">a deterministic painter</div>
        <h1>Ascendance<br/>of a Brush
          <svg viewBox="0 0 210 14" aria-hidden="true"><path d="M2 9 C 40 3, 90 12, 130 6 S 190 4, 208 8" fill="none" stroke="#b2341f" stroke-width="3.2" stroke-linecap="round" opacity=".85"/><path d="M8 11 C 60 7, 120 12, 200 7" fill="none" stroke="#b2341f" stroke-width="1" stroke-linecap="round" opacity=".5"/></svg>
        </h1>
      </div>
      <p class="vb-recipe" data-recipe></p>
      <details class="vb-adv"><summary>The rest of the recipe</summary><div data-adv></div>
        <p class="vb-note">Drag a red number sideways to change it, or click to type.</p></details>
      <div class="vb-err" aria-live="polite"></div>
    </div>
    <section class="vb-plate"></section>
  </main>`;
  const q = <T extends HTMLElement>(s: string) => root.querySelector<T>(s)!;
  const recipe = q("[data-recipe]"),
    advHost = q("[data-adv]"),
    plate = q(".vb-plate"),
    err = q(".vb-err");
  const open = filePicker(session, root);

  /** An inline number that scrubs on horizontal drag and types on click. */
  const num = (spec: Pick<SliderSpec, "k" | "min" | "max" | "step"> & Partial<SliderSpec>) => {
    const el = document.createElement("input");
    el.className = "vb-v";
    el.type = "text";
    el.inputMode = "decimal";
    el.setAttribute("aria-label", spec.label ?? spec.k);
    const show = () => {
      const v = session.settings[spec.k] as number;
      el.value = spec.label ? fmt(spec as SliderSpec, v) : String(v);
    };
    const commit = (v: number) => {
      const c = Math.min(spec.max, Math.max(spec.min, Math.round(v / spec.step) * spec.step));
      session.set(spec.k, +c.toFixed(4) as never);
    };
    let x0 = 0,
      v0 = 0,
      moved = false;
    el.addEventListener("pointerdown", (e) => {
      if (document.activeElement === el) return;
      e.preventDefault();
      x0 = e.clientX;
      v0 = session.settings[spec.k] as number;
      moved = false;
      el.setPointerCapture(e.pointerId);
    });
    el.addEventListener("pointermove", (e) => {
      if (!el.hasPointerCapture(e.pointerId)) return;
      const dx = e.clientX - x0;
      if (Math.abs(dx) > 3) moved = true;
      if (moved) commit(v0 + Math.round(dx / 6) * spec.step);
    });
    el.addEventListener("pointerup", () => {
      if (!moved) {
        el.focus();
        el.value = String(session.settings[spec.k]);
        el.select();
      }
    });
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter") el.blur();
      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        e.preventDefault();
        commit(
          (session.settings[spec.k] as number) + (e.key === "ArrowUp" ? spec.step : -spec.step),
        );
      }
    });
    el.addEventListener("blur", () => {
      const v = parseFloat(el.value);
      if (!Number.isNaN(v)) commit(v);
      show();
    });
    return { el, show };
  };
  const pick = (label: string, on: () => boolean, act: () => void) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "vb-pick";
    b.textContent = label;
    b.onclick = act;
    return { el: b, show: () => b.setAttribute("aria-pressed", String(on())) };
  };
  const t = (s: string) => document.createTextNode(s);
  const parts: { show: () => void }[] = [];
  const use = <P extends { el: HTMLElement; show: () => void }>(p: P) => (parts.push(p), p.el);

  // "Paint <image> with a <dab | curved> brush, seed <7> (another)."
  const imgBtn = document.createElement("button");
  imgBtn.type = "button";
  imgBtn.className = "vb-pick";
  imgBtn.onclick = open;
  parts.push({
    show: () =>
      (imgBtn.textContent = session.hasSource ? `“${session.name}”` : "an image of yours"),
  });
  const another = document.createElement("button");
  another.type = "button";
  another.className = "vb-link";
  another.textContent = "another seed";
  another.onclick = () => session.nextSeed();
  const seed = use(num({ k: "seed", min: -1e9, max: 1e9, step: 1 }));
  recipe.append(
    t("Paint "),
    imgBtn,
    t(" with a "),
    use(
      pick(
        "dab",
        () => session.brush === "dab",
        () => session.setBrush("dab"),
      ),
    ),
    t(" / "),
    use(
      pick(
        "curved",
        () => session.brush === "curve",
        () => session.setBrush("curve"),
      ),
    ),
    t(" brush, seed "),
    seed,
    t(". "),
    another,
  );

  const spec = (k: keyof Settings) => ADVANCED.find((s) => s.k === k)!;
  const n = (k: keyof Settings) => use(num(spec(k)));
  const p1 = document.createElement("p"),
    p2 = document.createElement("p"),
    p3 = document.createElement("p");
  const sizes = SIZES.flatMap((v, i) => [
    ...(i ? [t(" · ")] : []),
    use(
      pick(
        String(v),
        () => session.settings.size === v,
        () => session.set("size", v),
      ),
    ),
  ]);
  p1.append(
    t("Work at "),
    ...sizes,
    t(" px on the long side, in "),
    n("layers"),
    t(" layers, starting with a "),
    n("maxR"),
    t(" brush that halves each layer."),
  );
  p2.append(
    t("Repaint any patch more than "),
    n("threshold"),
    t(" off. A curve stops when its color drifts past "),
    n("tol"),
    t(" or after "),
    n("maxLen"),
    t(" segments. Loosen placement by "),
    n("jitter"),
    t(" and color by "),
    n("colorJitter"),
    t("."),
  );
  const grounds = GROUNDS.flatMap(([v, label], i) => [
    ...(i ? [t(" · ")] : []),
    use(
      pick(
        label.toLowerCase(),
        () => session.settings.ground === v,
        () => session.set("ground", v),
      ),
    ),
  ]);
  p3.append(
    t("Mix from "),
    n("palette"),
    t(" colors at "),
    n("opacity"),
    t(" opacity, over a "),
    ...grounds,
    t(" ground."),
  );
  advHost.append(p1, p2, p3);

  // Plate.
  const empty = document.createElement("div");
  empty.className = "vb-empty";
  empty.tabIndex = 0;
  empty.innerHTML = `<div><em>Drop an image here</em>or click to choose one. Nothing is uploaded.</div>`;
  empty.onclick = open;
  acceptDrops(root, session, (on) => empty.classList.toggle("hover", on));
  const sheet = document.createElement("div");
  sheet.className = "vb-sheet";
  const over = document.createElement("canvas");
  over.className = "vb-over";
  over.hidden = true;
  sheet.append(session.canvas, over);
  const cap = document.createElement("div");
  cap.className = "vb-cap";
  const strip = document.createElement("div");
  strip.className = "vb-strip";
  const peek = (c: HTMLCanvasElement | null) => {
    over.hidden = !c;
    if (!c) return;
    over.width = c.width;
    over.height = c.height;
    over.getContext("2d")!.drawImage(c, 0, 0);
  };

  let shown = "";
  const render = () => {
    for (const p of parts) if (document.activeElement !== (p as { el?: Element }).el) p.show();
    err.textContent = session.error;
    if (!session.hasSource) {
      plate.replaceChildren(empty);
      return;
    }
    if (!plate.contains(sheet)) plate.replaceChildren(sheet, cap, strip);
    const pr = session.progress,
      s = session.settings;
    const L = pr?.layers ?? s.layers;
    cap.innerHTML = `<b>Plate.</b> ${session.brush === "dab" ? "Dabs" : "Curved strokes"}, seed ${s.seed}, ${session.canvas.width} × ${session.canvas.height}. ${
      !pr
        ? ""
        : pr.done
          ? "Finished."
          : pr.layer === 0
            ? "Laying the ground…"
            : `Painting layer ${ROMAN[pr.layer - 1]} of ${ROMAN[L - 1]}, ${pr.radius} px brush…`
    }`;
    const key = `${session.snapshots.length}/${L}/${pr?.layer}`;
    if (shown === key) return;
    shown = key;
    const frames: HTMLElement[] = [];
    const frame = (label: string, c: HTMLCanvasElement | null, now = false) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "vb-frame" + (now ? " now" : "");
      if (c) {
        const th = document.createElement("canvas");
        th.width = 168;
        th.height = Math.round((168 * c.height) / c.width);
        th.getContext("2d")!.drawImage(c, 0, 0, th.width, th.height);
        b.append(th);
        b.onpointerenter = b.onfocus = () => peek(c);
        b.onpointerleave = b.onblur = () => peek(null);
      } else b.append(document.createElement("i"));
      b.append(t(label));
      frames.push(b);
    };
    frame("0 · source", session.source);
    for (let i = 0; i < L; i++)
      frame(
        `${ROMAN[i]} · ${Math.max(1.5, s.maxR / 2 ** i)} px`,
        session.snapshots[i] ?? null,
        pr?.layer === i + 1 && !pr.done,
      );
    strip.replaceChildren(...frames);
  };
  session.on(render);
  render();
}
