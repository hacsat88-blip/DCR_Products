import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createElement as h } from "react";
import { afterEach, describe, expect, it } from "vitest";

import { NewsSentimentStrip } from "../NewsSentimentStrip";

afterEach(() => cleanup());

const ITEMS = [
  {
    id: "n1",
    publishedAt: "2026-04-10T09:00:00Z",
    title: "上方修正を発表",
    url: "https://example.com/n1",
  },
  {
    id: "n2",
    publishedAt: "2026-04-10T15:00:00Z",
    title: "Analyst downgrade after miss",
    url: "https://example.com/n2",
  },
  {
    id: "n3",
    publishedAt: "2026-04-11T10:00:00Z",
    title: "新製品発表",
    url: "https://example.com/n3",
  },
];

describe("NewsSentimentStrip", () => {
  it("renders a colored bar per item with sentiment attribute", () => {
    render(h(NewsSentimentStrip, { items: ITEMS }));
    expect(screen.getByTestId("news-bar-n1").getAttribute("data-sentiment")).toBe("positive");
    expect(screen.getByTestId("news-bar-n2").getAttribute("data-sentiment")).toBe("negative");
    expect(screen.getByTestId("news-bar-n3").getAttribute("data-sentiment")).toBe("neutral");
  });

  it("shows a tooltip with title on hover", () => {
    render(h(NewsSentimentStrip, { items: ITEMS }));
    expect(screen.queryByTestId("news-tip-n1")).toBeNull();
    fireEvent.mouseEnter(screen.getByTestId("news-bar-n1"));
    expect(screen.getByTestId("news-tip-n1").textContent).toContain("上方修正を発表");
  });
});
