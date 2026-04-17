import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import { RangePicker } from "@/components/search/RangePicker";

describe("RangePicker", () => {
  it("JP from/to 入力で onChange が {jp:{from,to}} で呼ばれる", () => {
    const handleChange = vi.fn();
    render(
      <RangePicker market="JP" value={{}} onChange={handleChange} />,
    );

    const fromInput = screen.getByLabelText("JPコード開始") as HTMLInputElement;
    const toInput = screen.getByLabelText("JPコード終了") as HTMLInputElement;

    fireEvent.change(fromInput, { target: { value: "1300" } });
    fireEvent.change(toInput, { target: { value: "1400" } });

    expect(handleChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ jp: { from: 1300, to: 1400 } }),
    );
  });

  it("JP で from > to の場合は自動入れ替えされる", () => {
    const handleChange = vi.fn();
    render(
      <RangePicker market="JP" value={{}} onChange={handleChange} />,
    );

    fireEvent.change(screen.getByLabelText("JPコード開始"), {
      target: { value: "1500" },
    });
    fireEvent.change(screen.getByLabelText("JPコード終了"), {
      target: { value: "1400" },
    });

    expect(handleChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ jp: { from: 1400, to: 1500 } }),
    );
  });

  it("無効な JP 入力でエラーメッセージが表示される", () => {
    const handleChange = vi.fn();
    render(
      <RangePicker market="JP" value={{}} onChange={handleChange} />,
    );

    fireEvent.change(screen.getByLabelText("JPコード開始"), {
      target: { value: "abc" },
    });

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent(/数字のみ/);
  });

  it("US モードで onChange に {us:{from,to,exchange}} が渡る", () => {
    const handleChange = vi.fn();
    render(
      <RangePicker market="US" value={{}} onChange={handleChange} />,
    );

    fireEvent.change(screen.getByLabelText("USティッカー開始"), {
      target: { value: "AAP" },
    });
    fireEvent.change(screen.getByLabelText("USティッカー終了"), {
      target: { value: "AAPL" },
    });

    expect(handleChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        us: { from: "AAP", to: "AAPL", exchange: "ANY" },
      }),
    );
  });

  it("Enter 押下で onSubmit が呼ばれる", () => {
    const handleSubmit = vi.fn();
    render(
      <RangePicker
        market="JP"
        value={{}}
        onChange={() => {}}
        onSubmit={handleSubmit}
      />,
    );

    fireEvent.keyDown(screen.getByLabelText("JPコード開始"), { key: "Enter" });
    expect(handleSubmit).toHaveBeenCalledTimes(1);
  });

  it("クリアで値と onChange が初期化される", () => {
    const handleChange = vi.fn();
    render(
      <RangePicker
        market="JP"
        value={{ jp: { from: 1300, to: 1400 } }}
        onChange={handleChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "範囲をクリア" }));
    expect(handleChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ jp: undefined }),
    );
  });
});
