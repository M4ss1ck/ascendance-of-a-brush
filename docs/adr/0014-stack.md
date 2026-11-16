# Stack: Vite + TypeScript with no framework, pnpm, Vitest browser mode, Cloudflare Pages

- **App:** Vite and strict TypeScript, with plain DOM and no UI framework. The UI is a handful of controls, a selection overlay and a canvas, and the engine is framework-free math anyway.
- **Styling:** Tailwind CSS v4 through `@tailwindcss/vite`.
- **Tooling:**
  - pnpm on Node 26 (the current LTS).
  - oxlint for lint, which also bans `Math.random`.
  - oxfmt for formatting, including Tailwind class sorting.
  - Husky and lint-staged in pre-commit.
  - GitHub Actions CI.
- **Tests:** Vitest with two projects. `unit` runs in Node for pure math. `browser` runs in real Chromium through Playwright, for anything that touches Canvas 2D pixels, OffscreenCanvas or Workers. Pinning one engine matches the same-browser determinism scope (ADR-0003).
- **Hosting:** Cloudflare Pages through its GitHub integration, which gives PR previews with no deploy secrets in the repo.

## Considered Options

- **node-canvas for pixel tests.** Its hashes come from Cairo, not from the browser users run.
- **A component framework** (Preact, Lit, React). More than the UI needs today.
