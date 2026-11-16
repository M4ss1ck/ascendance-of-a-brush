/* oxlint-disable -- PROTOTYPE (issue #6): throwaway code on a throwaway branch. */
/** PROTOTYPE (issue #6): floating variant switcher, dev only. Not part of any design. */
import { makeSample } from "./sample.ts";
import type { Session } from "./session.ts";

export function mountSwitcher(
  keys: { key: string; name: string }[],
  current: string,
  session: Session,
): void {
  const i = Math.max(
    0,
    keys.findIndex((k) => k.key === current),
  );
  const go = (d: number) => {
    const next = keys[(i + d + keys.length) % keys.length]!;
    const u = new URL(location.href);
    u.searchParams.set("variant", next.key);
    location.href = u.toString();
  };
  const bar = document.createElement("div");
  bar.setAttribute(
    "style",
    "position:fixed;left:50%;bottom:14px;transform:translateX(-50%);z-index:9999;display:flex;gap:6px;align-items:center;" +
      "background:#000;color:#fff;font:600 12px/1 ui-monospace,monospace;padding:6px;border-radius:999px;box-shadow:0 6px 24px #0008;outline:2px dashed #ff0",
  );
  const btn = (t: string, f: () => void) => {
    const b = document.createElement("button");
    b.textContent = t;
    b.setAttribute(
      "style",
      "all:unset;cursor:pointer;padding:6px 10px;border-radius:999px;background:#222",
    );
    b.onclick = f;
    return b;
  };
  const label = document.createElement("span");
  label.textContent = `${keys[i]!.key} · ${keys[i]!.name}`;
  label.setAttribute("style", "padding:0 8px;white-space:nowrap");
  bar.append(
    btn("←", () => go(-1)),
    label,
    btn("→", () => go(1)),
    btn("test image", () => session.useDrawable(makeSample(), "Sample scene")),
  );
  document.body.append(bar);
  document.addEventListener("keydown", (e: KeyboardEvent) => {
    const t = e.target as HTMLElement;
    if (t.closest("input,textarea,select,[contenteditable]")) return;
    if (e.key === "ArrowLeft") go(-1);
    if (e.key === "ArrowRight") go(1);
  });
}
