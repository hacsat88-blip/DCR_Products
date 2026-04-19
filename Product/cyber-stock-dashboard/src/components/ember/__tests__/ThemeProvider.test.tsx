import { describe, it, expect, beforeEach } from "vitest";
import { render, act, renderHook } from "@testing-library/react";
import { ThemeProvider, useEmberTheme } from "../theme/ThemeProvider";

describe("ThemeProvider", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
  });

  it("returns safe defaults when used without provider", () => {
    const { result } = renderHook(() => useEmberTheme());
    expect(result.current.theme).toBe("light");
    expect(typeof result.current.toggleTheme).toBe("function");
  });

  it("applies stored theme on mount", () => {
    window.localStorage.setItem("ember-theme", "dark");
    render(
      <ThemeProvider>
        <span>child</span>
      </ThemeProvider>,
    );
    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  it("toggleTheme flips data-theme and persists to storage", () => {
    const { result } = renderHook(() => useEmberTheme(), {
      wrapper: ({ children }) => <ThemeProvider>{children}</ThemeProvider>,
    });

    act(() => {
      result.current.setTheme("dark");
    });
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(window.localStorage.getItem("ember-theme")).toBe("dark");

    act(() => {
      result.current.toggleTheme();
    });
    expect(result.current.theme).toBe("light");
    expect(document.documentElement.dataset.theme).toBe("light");
  });
});
