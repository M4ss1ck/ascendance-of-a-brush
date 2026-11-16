import { afterEach, describe, expect, it, vi, type Mock } from "vitest";
import { createRepainter, REPAINT_DELAY_MS } from "./repaint.ts";

type Worker = { terminate: Mock<() => void> };

/** A repainter whose spawn records every fake worker, plus a start spy. */
const setup = () => {
  const workers: Worker[] = [];
  const start = vi.fn<(worker: Worker, job: { frame: number }) => void>();
  const repainter = createRepainter(() => {
    const worker: Worker = { terminate: vi.fn<() => void>() };
    workers.push(worker);
    return worker;
  }, start);
  return { repainter, workers, start };
};

describe("createRepainter", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts one paint 180 ms after a request, not before", () => {
    vi.useFakeTimers();
    const { repainter, workers, start } = setup();
    repainter.request({ frame: 1 });

    vi.advanceTimersByTime(REPAINT_DELAY_MS - 1);
    expect(workers).toHaveLength(0);
    expect(start).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(workers).toHaveLength(1);
    expect(start).toHaveBeenCalledTimes(1);
    expect(start).toHaveBeenCalledWith(workers[0], { frame: 1 });
  });

  it("coalesces a burst within 180 ms into one paint with the last job", () => {
    vi.useFakeTimers();
    const { repainter, workers, start } = setup();
    repainter.request({ frame: 1 });
    vi.advanceTimersByTime(100);
    repainter.request({ frame: 2 });
    vi.advanceTimersByTime(100);
    repainter.request({ frame: 3 });

    vi.advanceTimersByTime(REPAINT_DELAY_MS);
    expect(workers).toHaveLength(1);
    expect(start).toHaveBeenCalledTimes(1);
    expect(start).toHaveBeenCalledWith(workers[0], { frame: 3 });
  });

  it("terminates the old worker only when the new timer fires, then starts a new one", () => {
    vi.useFakeTimers();
    const { repainter, workers, start } = setup();
    repainter.request({ frame: 1 });
    vi.advanceTimersByTime(REPAINT_DELAY_MS);
    const first = workers[0]!;
    expect(first.terminate).not.toHaveBeenCalled();

    repainter.request({ frame: 2 });
    expect(first.terminate).not.toHaveBeenCalled();
    expect(workers).toHaveLength(1);

    vi.advanceTimersByTime(REPAINT_DELAY_MS - 1);
    expect(first.terminate).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(first.terminate).toHaveBeenCalledTimes(1);
    expect(workers).toHaveLength(2);
    const second = workers[1]!;
    expect(second.terminate).not.toHaveBeenCalled();
    expect(start).toHaveBeenCalledTimes(2);
    expect(start).toHaveBeenLastCalledWith(second, { frame: 2 });
  });

  it("dispose cancels a pending start and terminates the running worker", () => {
    vi.useFakeTimers();
    const { repainter, workers, start } = setup();
    repainter.request({ frame: 1 });
    vi.advanceTimersByTime(REPAINT_DELAY_MS);
    const first = workers[0]!;

    repainter.request({ frame: 2 });
    repainter.dispose();

    vi.advanceTimersByTime(REPAINT_DELAY_MS);
    expect(workers).toHaveLength(1);
    expect(start).toHaveBeenCalledTimes(1);
    expect(first.terminate).toHaveBeenCalledTimes(1);

    repainter.dispose();
    expect(first.terminate).toHaveBeenCalledTimes(1);
  });
});
