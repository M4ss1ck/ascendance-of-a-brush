import { fnv1a } from "./fnv1a.ts";
import { hashableScene } from "./smoke-scene.ts";

self.addEventListener("message", () => {
  self.postMessage(fnv1a(hashableScene()));
});
