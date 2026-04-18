import { describe, it, expect, beforeEach } from "vitest";
import {
  getServerEnv,
  requireEnv,
  __resetEnvCacheForTests,
} from "@/lib/env";

describe("env", () => {
  beforeEach(() => {
    __resetEnvCacheForTests();
  });

  it("returns parsed env", () => {
    process.env.JQUANTS_REFRESH_TOKEN = "rt";
    expect(getServerEnv().JQUANTS_REFRESH_TOKEN).toBe("rt");
  });

  it("requireEnv throws when missing", () => {
    delete process.env.MARKETAUX_API_KEY;
    __resetEnvCacheForTests();
    expect(() => requireEnv("MARKETAUX_API_KEY")).toThrow(/Missing/);
  });
});
