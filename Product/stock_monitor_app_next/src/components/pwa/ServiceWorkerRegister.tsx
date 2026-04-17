"use client";

import { useEffect } from "react";

export interface ServiceWorkerRegisterProps {
  /** Override the environment gate. Primarily used in tests. */
  forceEnabled?: boolean;
  /** Path to the service worker script. */
  scriptUrl?: string;
}

/**
 * Registers the production service worker (`/sw.js`) so the app behaves as
 * an installable PWA. No-op in development, during SSR, or when the browser
 * does not expose `navigator.serviceWorker`.
 */
export function ServiceWorkerRegister({
  forceEnabled,
  scriptUrl = "/sw.js",
}: ServiceWorkerRegisterProps = {}): null {
  useEffect(() => {
    const isProd =
      forceEnabled ?? process.env.NODE_ENV === "production";
    if (!isProd) return;
    if (typeof window === "undefined") return;
    if (typeof navigator === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    let cancelled = false;
    const register = (): void => {
      navigator.serviceWorker
        .register(scriptUrl)
        .then((registration) => {
          if (cancelled) return;
          // Hint newer worker to take control ASAP.
          registration.update().catch(() => undefined);
        })
        .catch((error) => {
          console.warn("[ServiceWorkerRegister] register failed", error);
        });
    };

    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register, { once: true });
    }

    return () => {
      cancelled = true;
    };
  }, [forceEnabled, scriptUrl]);

  return null;
}

export default ServiceWorkerRegister;
