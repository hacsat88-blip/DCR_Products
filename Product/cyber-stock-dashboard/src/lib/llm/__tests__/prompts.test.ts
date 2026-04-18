import { describe, it, expect } from "vitest";
import { BOUNDARY, withBoundary } from "../prompts/boundary";
import { ANALYZER_SYSTEM_PROMPT } from "../prompts/analyzer";
import { SUMMARIZER_SYSTEM_PROMPT } from "../prompts/summarizer";
import { INTENT_SYSTEM_PROMPT } from "../prompts/intentExtractor";

describe("prompts/boundary", () => {
  it("BOUNDARY contains forbidden-assertion clauses", () => {
    expect(BOUNDARY).toMatch(/断定/);
    expect(BOUNDARY).toMatch(/保証/);
  });

  it("BOUNDARY warns against 売買命令 and includes Disclaimer", () => {
    expect(BOUNDARY).toMatch(/購入・売却/);
    expect(BOUNDARY).toMatch(/Disclaimer/);
  });

  it("withBoundary prepends BOUNDARY to system prompt", () => {
    const composed = withBoundary("# CUSTOM");
    expect(composed.startsWith(BOUNDARY)).toBe(true);
    expect(composed).toContain("# CUSTOM");
  });

  it("all system prompts include BOUNDARY", () => {
    for (const sp of [ANALYZER_SYSTEM_PROMPT, SUMMARIZER_SYSTEM_PROMPT, INTENT_SYSTEM_PROMPT]) {
      expect(sp).toMatch(/断定/);
      expect(sp).toMatch(/保証/);
    }
  });
});
