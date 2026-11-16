/* oxlint-disable -- PROTOTYPE (issue #6): throwaway code on a throwaway branch. */
// PROTOTYPE (issue #6): dev-only test image, copied from makeSample in docs/reference/brush-bench.html.
// @ts-nocheck
import { rngFrom } from "../engine/prng.ts";
export function makeSample(): HTMLCanvasElement {
  const W = 640,
    H = 480,
    cv = document.createElement("canvas");
  cv.width = W;
  cv.height = H;
  const c = cv.getContext("2d"),
    r = rngFrom(42, 9);
  let g = c.createLinearGradient(0, 0, 0, H * 0.62);
  g.addColorStop(0, "#1c3a6e");
  g.addColorStop(0.55, "#d9795a");
  g.addColorStop(1, "#f5c46a");
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
  g = c.createRadialGradient(430, 230, 10, 430, 230, 140);
  g.addColorStop(0, "rgba(255,244,205,1)");
  g.addColorStop(0.25, "rgba(255,226,160,.9)");
  g.addColorStop(1, "rgba(255,200,120,0)");
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
  c.fillStyle = "#fff3cf";
  c.beginPath();
  c.arc(430, 230, 34, 0, Math.PI * 2);
  c.fill();
  const ranges = [
    ["#6a5476", 250, 40, 0.012],
    ["#463a5e", 270, 34, 0.02],
    ["#262840", 292, 22, 0.035],
  ];
  ranges.forEach(([col, base, amp, f], k) => {
    c.fillStyle = col;
    c.beginPath();
    c.moveTo(0, H);
    for (let x = 0; x <= W; x += 4)
      c.lineTo(
        x,
        base -
          amp *
            (Math.sin(x * f + k * 2) +
              0.5 * Math.sin(x * f * 2.7 + k) +
              0.25 * Math.sin(x * f * 6.1)),
      );
    c.lineTo(W, H);
    c.closePath();
    c.fill();
  });
  g = c.createLinearGradient(0, 300, 0, H);
  g.addColorStop(0, "#3a4e72");
  g.addColorStop(1, "#14203a");
  c.fillStyle = g;
  c.fillRect(0, 300, W, H - 300);
  for (let i = 0; i < 70; i++) {
    const y = 305 + i * 1.6 + r() * 3,
      w = 90 - i * 0.9 + r() * 40;
    c.globalAlpha = 0.55 - i * 0.006;
    c.fillStyle = i % 3 ? "#f2b765" : "#ffe7b0";
    c.fillRect(430 - w / 2 + (r() - 0.5) * 20, y, w, 1.4);
  }
  c.globalAlpha = 1;
  c.fillStyle = "#1b2416";
  c.beginPath();
  c.moveTo(0, H);
  for (let x = 0; x <= W; x += 8)
    c.lineTo(x, 420 + 18 * Math.sin(x * 0.01) + 6 * Math.sin(x * 0.05));
  c.lineTo(W, H);
  c.fill();
  c.fillStyle = "#2a1d14";
  c.fillRect(96, 230, 14, 200);
  [
    [103, 215, 60, "#1f3a22"],
    [70, 250, 42, "#25472a"],
    [140, 245, 46, "#2d5431"],
    [100, 175, 44, "#2f5a33"],
    [120, 205, 38, "#3a6a3c"],
  ].forEach(([x, y, rr, col]) => {
    c.fillStyle = col;
    c.beginPath();
    c.arc(x, y, rr, 0, Math.PI * 2);
    c.fill();
  });
  c.lineCap = "round";
  for (let i = 0; i < 260; i++) {
    const x = r() * W,
      y = 430 + r() * 50,
      h = 10 + r() * 22;
    c.strokeStyle = r() < 0.5 ? "#3f6a2e" : "#5c8a3a";
    c.lineWidth = 1.5;
    c.beginPath();
    c.moveTo(x, y);
    c.quadraticCurveTo(x + (r() - 0.5) * 8, y - h / 2, x + (r() - 0.5) * 12, y - h);
    c.stroke();
  }
  for (let i = 0; i < 70; i++) {
    const x = r() * W,
      y = 425 + r() * 50;
    c.fillStyle = ["#e0473a", "#f2c335", "#f4efe6", "#c94f8a"][(r() * 4) | 0];
    c.beginPath();
    c.arc(x, y, 2.5 + r() * 3, 0, Math.PI * 2);
    c.fill();
  }
  return cv;
}
