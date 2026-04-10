export type AppRuntime = "nextjs" | "artifact";

export interface RuntimeConfig {
  runtime: AppRuntime;
}

type RuntimeConfigOverride = Partial<RuntimeConfig>;

declare global {
  // eslint-disable-next-line no-var
  var __STOCK_MONITOR_RUNTIME__: RuntimeConfigOverride | undefined;

  interface Window {
    __STOCK_MONITOR_RUNTIME__?: RuntimeConfigOverride;
  }
}

function parseRuntime(value: string | undefined): AppRuntime | null {
  if (value === "nextjs" || value === "artifact") {
    return value;
  }
  return null;
}

function readRuntimeOverride(): AppRuntime | null {
  if (typeof globalThis === "undefined") {
    return null;
  }

  return parseRuntime(globalThis.__STOCK_MONITOR_RUNTIME__?.runtime);
}

function readRuntimeEnv(): AppRuntime | null {
  if (typeof process === "undefined") {
    return null;
  }

  return parseRuntime(process.env.NEXT_PUBLIC_STOCK_MONITOR_RUNTIME);
}

export function getRuntimeConfig(): RuntimeConfig {
  return {
    runtime: readRuntimeOverride() ?? readRuntimeEnv() ?? "nextjs"
  };
}

export function isArtifactRuntime(): boolean {
  return getRuntimeConfig().runtime === "artifact";
}
