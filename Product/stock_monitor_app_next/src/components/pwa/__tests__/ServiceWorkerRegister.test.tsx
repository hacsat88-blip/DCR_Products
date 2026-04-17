import { render, cleanup } from "@testing-library/react";
import { createElement as h } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ServiceWorkerRegister } from "../ServiceWorkerRegister";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function installServiceWorkerMock(register: ReturnType<typeof vi.fn>): void {
  Object.defineProperty(navigator, "serviceWorker", {
    configurable: true,
    value: { register },
  });
}

function uninstallServiceWorkerMock(): void {
  const nav = navigator as unknown as { serviceWorker?: unknown };
  delete nav.serviceWorker;
}

describe("ServiceWorkerRegister", () => {
  it("registers /sw.js when forceEnabled and serviceWorker is available", async () => {
    const update = vi.fn().mockResolvedValue(undefined);
    const register = vi.fn().mockResolvedValue({ update });
    installServiceWorkerMock(register);

    render(h(ServiceWorkerRegister, { forceEnabled: true }));

    // register is scheduled on load or immediately when readyState === "complete".
    await Promise.resolve();
    await Promise.resolve();

    expect(register).toHaveBeenCalledWith("/sw.js");
    uninstallServiceWorkerMock();
  });

  it("is a no-op when forceEnabled is false (dev mode)", async () => {
    const register = vi.fn().mockResolvedValue({ update: vi.fn() });
    installServiceWorkerMock(register);

    render(h(ServiceWorkerRegister, { forceEnabled: false }));
    await Promise.resolve();

    expect(register).not.toHaveBeenCalled();
    uninstallServiceWorkerMock();
  });

  it("skips registration when navigator.serviceWorker is missing", async () => {
    uninstallServiceWorkerMock();
    // Render should not throw even without serviceWorker support.
    expect(() =>
      render(h(ServiceWorkerRegister, { forceEnabled: true })),
    ).not.toThrow();
  });
});
