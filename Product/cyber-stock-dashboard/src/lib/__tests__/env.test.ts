import { describe, it, expect, beforeEach } from "vitest";
import {
  getServerEnv,
  requireEnv,
  __resetEnvCacheForTests,
} from "@/lib/env";

describe("env", () => {
  beforeEach(() => {
    __resetEnvCacheForTests();
    delete process.env.JQUANTS_API_KEY;
    delete process.env.JQUANTS_REFRESH_TOKEN;
    delete process.env.MARKETAUX_API_KEY;
  });

  it("returns parsed env (J-Quants API key)", () => {
    process.env.JQUANTS_API_KEY = "jq-api-key";
    expect(getServerEnv().JQUANTS_API_KEY).toBe("jq-api-key");
  });

  it("returns parsed env (legacy refresh token)", () => {
    process.env.JQUANTS_REFRESH_TOKEN = "rt";
    expect(getServerEnv().JQUANTS_REFRESH_TOKEN).toBe("rt");
  });

  it("requireEnv throws when missing", () => {
    delete process.env.MARKETAUX_API_KEY;
    __resetEnvCacheForTests();
    expect(() => requireEnv("MARKETAUX_API_KEY")).toThrow(/Missing/);
  });
});
