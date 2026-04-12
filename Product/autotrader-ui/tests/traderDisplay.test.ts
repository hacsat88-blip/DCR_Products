import { describe, expect, test } from "vitest";

import {
  getActionLabel,
  getAiModeLabel,
  getFeedRoleLabel,
  getFeedSourceLabel,
  getTradeModeLabel
} from "@/lib/trader-display";

describe("trader-display", () => {
  test("maps actions to Japanese labels", () => {
    expect(getActionLabel("buy")).toBe("買い");
    expect(getActionLabel("sell")).toBe("売り");
    expect(getActionLabel("hold")).toBe("見送り");
    expect(getActionLabel("none")).toBe("未判定");
  });

  test("maps AI and trading modes to localized labels", () => {
    expect(getAiModeLabel("gemini")).toBe("Gemini");
    expect(getAiModeLabel("hybrid")).toBe("ハイブリッド");
    expect(getTradeModeLabel("conservative")).toBe("慎重");
    expect(getTradeModeLabel("balanced")).toBe("標準");
    expect(getTradeModeLabel("aggressive")).toBe("積極");
  });

  test("maps feed labels to localized display names", () => {
    expect(getFeedRoleLabel("execution")).toBe("執行");
    expect(getFeedRoleLabel("reference")).toBe("参照");
    expect(getFeedRoleLabel(null)).toBeNull();
    expect(getFeedSourceLabel("rakuten_rss")).toBe("楽天RSS");
    expect(getFeedSourceLabel("jquants_light")).toBe("J-Quants Light");
    expect(getFeedSourceLabel("jquants_free")).toBe("J-Quants Free");
    expect(getFeedSourceLabel(null)).toBeNull();
  });
});