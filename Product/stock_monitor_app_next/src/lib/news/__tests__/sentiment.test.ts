import { describe, expect, it } from "vitest";

import { classifySentiment } from "../sentiment";

describe("classifySentiment", () => {
  it("classifies Japanese positive keywords as positive", () => {
    expect(classifySentiment("通期業績を上方修正、増配を発表")).toBe("positive");
    expect(classifySentiment("最高益を更新")).toBe("positive");
  });

  it("classifies Japanese negative keywords as negative", () => {
    expect(classifySentiment("通期業績を下方修正")).toBe("negative");
    expect(classifySentiment("減配と減益見通し、赤字拡大")).toBe("negative");
  });

  it("classifies English positive/negative keywords", () => {
    expect(classifySentiment("Company X beats estimates, record high")).toBe("positive");
    expect(classifySentiment("Analyst downgrade after earnings miss")).toBe("negative");
  });

  it("returns neutral when positive and negative signals tie", () => {
    expect(classifySentiment("上方修正を撤回、下方修正へ")).toBe("neutral");
    expect(classifySentiment("特に材料なし")).toBe("neutral");
  });
});
