import "@testing-library/jest-dom/vitest";

// Polyfill ResizeObserver for Recharts / ResponsiveContainer under jsdom.
if (typeof globalThis.ResizeObserver === "undefined") {
  class ResizeObserverPolyfill {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }
  (globalThis as unknown as { ResizeObserver: typeof ResizeObserverPolyfill }).ResizeObserver =
    ResizeObserverPolyfill;
}
