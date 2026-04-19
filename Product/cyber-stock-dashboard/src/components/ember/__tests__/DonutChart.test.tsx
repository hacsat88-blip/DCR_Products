import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
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
});
