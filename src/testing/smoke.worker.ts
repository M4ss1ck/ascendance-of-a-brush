import { fnv1a } from "./fnv1a.ts";
import { hashableScene } from "./smoke-scene.ts";

// tsconfig loads DOM and WebWorker libs together, which types `self` as Window.
// Every *.worker.ts redeclares it so worker-only APIs type-check correctly.
declare const self: DedicatedWorkerGlobalScope;

self.addEventListener("message", () => {
  self.postMessage(fnv1a(hashableScene()));
});
