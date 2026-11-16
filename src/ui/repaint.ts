/** How long the settings must stay unchanged before a repaint starts (issue #6). */
export const REPAINT_DELAY_MS = 180;

/**
 * Debounced, cancel-and-repaint scheduler. A newer request cancels the pending
 * paint; when the timer fires the running worker is terminated and a fresh one
 * starts the latest job. Pure logic: no DOM, spawns and starts are injected.
 */
export function createRepainter<J, W extends { terminate(): void }>(
  spawn: () => W,
  start: (worker: W, job: J) => void,
): { request(job: J): void; dispose(): void } {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let current: W | undefined;

  return {
    request(job: J): void {
      clearTimeout(timer);
      timer = setTimeout(() => {
        timer = undefined;
        current?.terminate();
        current = spawn();
        start(current, job);
      }, REPAINT_DELAY_MS);
    },
    dispose(): void {
      clearTimeout(timer);
      timer = undefined;
      current?.terminate();
      current = undefined;
    },
  };
}
