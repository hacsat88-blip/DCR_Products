import "@testing-library/jest-dom";

// jsdom doesn't implement ResizeObserver; chart components rely on it.
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (typeof globalThis.ResizeObserver === "undefined") {
  (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver =
    ResizeObserverMock;
}
