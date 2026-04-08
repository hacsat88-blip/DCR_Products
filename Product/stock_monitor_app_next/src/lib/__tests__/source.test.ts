import { describe, expect, it } from "vitest";

import { getSourceLabelMeta, resolveSourceLabel } from "@/types/source";

describe("source label metadata", () => {
  it("returns canonical names for each source label", () => {
    expect(getSourceLabelMeta("YF")).toEqual({ label: "YF", name: "Yahoo Finance" });
    expect(getSourceLabelMeta("AV")).toEqual({ label: "AV", name: "Alpha Vantage" });
    expect(getSourceLabelMeta("C")).toEqual({ label: "C", name: "Composite" });
    expect(getSourceLabelMeta("M")).toEqual({ label: "M", name: "Mock" });
  });

  it("falls back to mock metadata for invalid labels", () => {
    expect(getSourceLabelMeta("INVALID")).toEqual({ label: "M", name: "Mock" });
  });

  it("resolves overall labels consistently", () => {
    expect(resolveSourceLabel(["YF", "YF"])).toBe("YF");
    expect(resolveSourceLabel(["YF", "AV"])).toBe("C");
    expect(resolveSourceLabel([null, undefined])).toBe("M");
  });
});
