"use client";

export type PollingMode = "interval" | "manual";

export interface PollingController {
  schedule: (task: () => void, intervalMs: number) => () => void;
}

export interface PollingOptions {
  mode?: PollingMode;
  controller?: PollingController;
}

const noop = (): void => {};

export const windowIntervalPollingController: PollingController = {
  schedule(task, intervalMs) {
    const timer = globalThis.setInterval(task, intervalMs);
    return () => {
      globalThis.clearInterval(timer);
    };
  }
};

export function startPolling(task: () => void, intervalMs: number, options?: PollingOptions): () => void {
  if (options?.mode === "manual") {
    return noop;
  }

  const controller = options?.controller ?? windowIntervalPollingController;
  return controller.schedule(task, intervalMs);
}
