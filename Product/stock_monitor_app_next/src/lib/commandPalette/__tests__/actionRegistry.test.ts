import { describe, expect, it } from "vitest";

import { filterActions, type CommandAction } from "../actionRegistry";

const noop = (): void => {};

const sample: CommandAction[] = [
  {
    id: "nav.portfolio",
    label: "ポートフォリオを開く",
    keywords: ["portfolio", "holdings"],
    section: "ナビゲーション",
    onSelect: noop,
  },
  {
    id: "nav.dashboard",
    label: "Dashboard",
    keywords: ["home", "top"],
    section: "ナビゲーション",
    onSelect: noop,
  },
  {
    id: "theme.reset",
    label: "レイアウトをリセット",
    keywords: ["layout", "reset"],
    section: "表示",
    onSelect: noop,
  },
  {
    id: "snapshot.export",
    label: "スナップショットを書き出し",
    keywords: ["export", "portable"],
    section: "データ",
    onSelect: noop,
  },
];

describe("filterActions", () => {
  it("returns all actions when query is empty or whitespace", () => {
    expect(filterActions(sample, "")).toHaveLength(sample.length);
    expect(filterActions(sample, "   ")).toHaveLength(sample.length);
  });

  it('matches "port" against nav.portfolio and excludes theme.reset', () => {
    const result = filterActions(sample, "port");
    const ids = result.map((a) => a.id);
    expect(ids).toContain("nav.portfolio");
    expect(ids).not.toContain("theme.reset");
  });

  it("prefers label prefix match over substring match", () => {
    const actions: CommandAction[] = [
      { id: "a", label: "reopen dashboard", onSelect: noop },
      { id: "b", label: "Dashboard", onSelect: noop },
    ];
    const result = filterActions(actions, "dash");
    expect(result[0]?.id).toBe("b");
    expect(result[1]?.id).toBe("a");
  });

  it("falls back to keywords when label does not match", () => {
    const result = filterActions(sample, "portable");
    expect(result.map((a) => a.id)).toEqual(["snapshot.export"]);
  });
});
