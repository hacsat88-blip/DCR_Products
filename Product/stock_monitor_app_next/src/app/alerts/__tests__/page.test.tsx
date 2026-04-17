import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import AlertsPage from "../page";
import { ALERTS_STORAGE_KEY, useAlertsStore } from "@/store/useAlertsStore";

beforeEach(() => {
  useAlertsStore.setState({ rules: [] }, false);
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(ALERTS_STORAGE_KEY);
  }
});

afterEach(() => {
  cleanup();
  useAlertsStore.setState({ rules: [] }, false);
});

function fillAndAdd(symbol: string, target: string): void {
  fireEvent.change(screen.getByLabelText("symbol"), { target: { value: symbol } });
  fireEvent.change(screen.getByLabelText("target"), { target: { value: target } });
  fireEvent.click(screen.getByRole("button", { name: "ルール追加" }));
}

describe("AlertsPage", () => {
  it("初期表示で空メッセージを表示", () => {
    render(<AlertsPage />);
    expect(screen.getByText("ルールはまだありません。")).toBeInTheDocument();
  });

  it("フォーム送信で一覧に追加される", () => {
    render(<AlertsPage />);
    fillAndAdd("7203", "3000");
    expect(screen.getAllByTestId("rule-row").length).toBe(1);
    expect(screen.getByText(/7203/)).toBeInTheDocument();
  });

  it("ON/OFF トグル・削除が機能する", () => {
    render(<AlertsPage />);
    fillAndAdd("AAPL", "200");
    const rule = useAlertsStore.getState().rules[0];
    const toggle = screen.getByLabelText(`enabled-${rule.id}`) as HTMLInputElement;
    expect(toggle.checked).toBe(true);
    fireEvent.click(toggle);
    expect(useAlertsStore.getState().rules[0].enabled).toBe(false);

    fireEvent.click(screen.getByLabelText(`remove-${rule.id}`));
    expect(useAlertsStore.getState().rules).toHaveLength(0);
  });

  it("デモ評価ボタンで evaluateRule の結果が表示される", () => {
    render(<AlertsPage />);
    fillAndAdd("7203", "100");
    fireEvent.change(screen.getByLabelText("demo-price"), { target: { value: "120" } });
    fireEvent.click(screen.getByRole("button", { name: "評価実行" }));
    const result = screen.getByTestId("demo-result");
    expect(result.textContent).toContain("TRIGGERED");
  });
});
