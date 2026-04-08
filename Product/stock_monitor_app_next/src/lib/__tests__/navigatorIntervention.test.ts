import { describe, expect, it } from "vitest";

import {
  buildStageBridgeMessage,
  nextAutoAdvanceSeconds,
  shouldPauseAutoAdvance,
} from "@/lib/navigatorIntervention";

describe("navigatorIntervention", () => {
  it("pauses auto-advance while user is typing", () => {
    expect(shouldPauseAutoAdvance("note")).toBe(true);
    expect(nextAutoAdvanceSeconds(8, "note")).toBe(8);
    expect(nextAutoAdvanceSeconds(8, "")).toBe(7);
  });

  it("builds bridge message before next stage", () => {
    const message = buildStageBridgeMessage(0, 1, "check financial leverage");
    expect(message).toContain("navigator.bridge");
    expect(message).toContain("stage 1 -> stage 2");
    expect(message).toContain("check financial leverage");
  });
});
