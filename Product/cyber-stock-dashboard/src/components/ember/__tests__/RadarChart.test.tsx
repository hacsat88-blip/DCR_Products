import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { RadarChart } from "../charts/RadarChart";

describe("RadarChart", () => {
  const scores = {
    momentum: 70,
    value: 60,
    quality: 80,
    growth: 55,
    sentiment: 65,
  };

  it("renders default Japanese axis labels", () => {
    const { getByText } = render(<RadarChart scores={scores} animated={false} />);
    ["モメンタム", "バリュー", "クオリティ", "グロース", "センチメント"].forEach((l) =>
      expect(getByText(l)).toBeInTheDocument(),
    );
  });

  it("renders custom axis labels when provided", () => {
    const labels = ["A", "B", "C", "D", "E"];
    const { getByText } = render(
      <RadarChart scores={scores} animated={false} axisLabels={labels} />,
    );
    labels.forEach((l) => expect(getByText(l)).toBeInTheDocument());
  });

  it("renders total score average rounded", () => {
    const { getByText } = render(<RadarChart scores={scores} animated={false} />);
    expect(getByText("66")).toBeInTheDocument();
  });

  it("renders compare polygon when compareScores given", () => {
    const { container } = render(
      <RadarChart
        scores={scores}
        compareScores={{ momentum: 30, value: 40, quality: 50, growth: 45, sentiment: 35 }}
        animated={false}
      />,
    );
    const polygons = container.querySelectorAll("polygon");
    expect(polygons.length).toBeGreaterThanOrEqual(6);
  });
});
