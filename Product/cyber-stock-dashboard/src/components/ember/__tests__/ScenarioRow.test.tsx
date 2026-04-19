import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ScenarioRow from "../composites/ScenarioRow";

describe("ScenarioRow", () => {
  const row = {
    horizon: "3M",
    bull: "+20%",
    base: "+8%",
    bear: "-12%",
  };

  it("renders horizon and BULL/BASE/BEAR labels", () => {
    render(<ScenarioRow row={row} />);
    expect(screen.getByText("3M")).toBeInTheDocument();
    expect(screen.getByText("BULL")).toBeInTheDocument();
    expect(screen.getByText("BASE")).toBeInTheDocument();
    expect(screen.getByText("BEAR")).toBeInTheDocument();
  });

  it("renders all three scenario values", () => {
    render(<ScenarioRow row={row} />);
    expect(screen.getByText("+20%")).toBeInTheDocument();
    expect(screen.getByText("+8%")).toBeInTheDocument();
    expect(screen.getByText("-12%")).toBeInTheDocument();
  });
});
