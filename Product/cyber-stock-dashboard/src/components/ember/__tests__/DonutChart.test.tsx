import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { DonutChart } from "../charts/DonutChart";

describe("DonutChart", () => {
  const slices = [
    { id: "a", label: "Tech", value: 40 },
    { id: "b", label: "Finance", value: 35 },
    { id: "c", label: "Energy", value: 25 },
  ];

  it("renders one path per slice", () => {
    const { container } = render(<DonutChart slices={slices} />);
    const paths = container.querySelectorAll("path");
    expect(paths.length).toBe(slices.length);
  });

  it("renders centerLabel and total when no hover", () => {
    const { getByText } = render(
      <DonutChart slices={slices} centerLabel="Sectors" />,
    );
    expect(getByText("SECTORS")).toBeInTheDocument();
    expect(getByText("100")).toBeInTheDocument();
  });

  it("uses provided color for slice fill", () => {
    const { container } = render(
      <DonutChart slices={[{ id: "x", label: "X", value: 1, color: "#ff00ff" }]} />,
    );
    const path = container.querySelector("path");
    expect(path?.getAttribute("fill")).toBe("#ff00ff");
  });

  it("falls back to palette when color omitted", () => {
    const { container } = render(<DonutChart slices={slices} />);
    const fills = Array.from(container.querySelectorAll("path")).map((p) =>
      p.getAttribute("fill"),
    );
    expect(fills.every((f) => f && f.startsWith("var(--"))).toBe(true);
  });

  // Accessibility tests
  it("each slice has tabIndex=0 for keyboard navigation", () => {
    const { container } = render(<DonutChart slices={slices} />);
    const paths = container.querySelectorAll("path");
    paths.forEach((path) => {
      expect(path.getAttribute("tabindex")).toBe("0");
    });
  });

  it("each slice has role=button", () => {
    const { container } = render(<DonutChart slices={slices} />);
    const paths = container.querySelectorAll("path");
    paths.forEach((path) => {
      expect(path.getAttribute("role")).toBe("button");
    });
  });

  it("each slice has aria-label with label and percentage", () => {
    const { container } = render(<DonutChart slices={slices} />);
    const paths = container.querySelectorAll("path");
    expect(paths[0].getAttribute("aria-label")).toBe("Tech 40.0%");
    expect(paths[1].getAttribute("aria-label")).toBe("Finance 35.0%");
    expect(paths[2].getAttribute("aria-label")).toBe("Energy 25.0%");
  });

  it("calls onSliceHover when slice is focused", () => {
    const onSliceHover = vi.fn();
    const { container } = render(
      <DonutChart slices={slices} onSliceHover={onSliceHover} />,
    );
    const firstPath = container.querySelector("path");
    if (firstPath) {
      fireEvent.focus(firstPath);
    }
    expect(onSliceHover).toHaveBeenCalledWith("a");
  });
});
