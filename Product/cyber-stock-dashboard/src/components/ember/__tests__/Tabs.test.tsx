import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Tabs } from "../ui/Tabs";

describe("Tabs", () => {
  const tabs = [
    { id: "home", label: "ホーム", jp: "Home" },
    { id: "portfolio", label: "ポートフォリオ", jp: "Portfolio" },
    { id: "analyze", label: "分析", jp: "Analyze" },
  ];

  it("renders all tab labels", () => {
    render(<Tabs tabs={tabs} current="home" onChange={() => {}} />);
    expect(screen.getByText("ホーム")).toBeInTheDocument();
    expect(screen.getByText("ポートフォリオ")).toBeInTheDocument();
    expect(screen.getByText("分析")).toBeInTheDocument();
  });

  it("renders JP sublabels", () => {
    render(<Tabs tabs={tabs} current="home" onChange={() => {}} />);
    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.getByText("Portfolio")).toBeInTheDocument();
    expect(screen.getByText("Analyze")).toBeInTheDocument();
  });

  it("nav has aria-label for main navigation", () => {
    const { container } = render(
      <Tabs tabs={tabs} current="home" onChange={() => {}} />,
    );
    const nav = container.querySelector('nav[aria-label="メインナビゲーション"]');
    expect(nav).toBeInTheDocument();
  });

  it("active tab has aria-current=page", () => {
    render(<Tabs tabs={tabs} current="portfolio" onChange={() => {}} />);
    const activeButton = screen.getByRole("button", { current: "page" });
    expect(activeButton).toBeInTheDocument();
    expect(activeButton.textContent).toContain("ポートフォリオ");
  });

  it("non-active tabs do not have aria-current", () => {
    render(<Tabs tabs={tabs} current="home" onChange={() => {}} />);
    const portfolioButton = screen.getByText("ポートフォリオ").closest("button");
    expect(portfolioButton?.getAttribute("aria-current")).toBeNull();
  });

  it("calls onChange with tab id when clicked", () => {
    const onChange = vi.fn();
    render(<Tabs tabs={tabs} current="home" onChange={onChange} />);
    const analyzeButton = screen.getByText("分析").closest("button");
    analyzeButton?.click();
    expect(onChange).toHaveBeenCalledWith("analyze");
  });
});
