import { playwright } from "@vitest/browser-playwright";
import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config.ts";

// Two lanes, see AGENTS.md "Tests":
// - unit: pure modules (PRNG, blur, tensor, planner math) in Node. Fast, runs in the pre-commit hook.
// - browser: anything that touches Canvas 2D pixels, OffscreenCanvas or Workers, in real Chromium.
//   Pixel hashes are only stable within one engine (ADR-0003), so this lane pins Chromium.
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      projects: [
        {
          extends: true,
          test: {
            name: "unit",
            environment: "node",
            include: ["src/**/*.test.ts"],
            exclude: ["src/**/*.browser.test.ts"],
          },
        },
        {
          extends: true,
          test: {
            name: "browser",
            include: ["src/**/*.browser.test.ts"],
            browser: {
              enabled: true,
              headless: true,
              provider: playwright(),
              instances: [{ browser: "chromium" }],
            },
          },
        },
      ],
    },
  }),
);
