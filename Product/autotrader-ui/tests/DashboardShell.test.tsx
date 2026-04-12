import { render, screen } from "@testing-library/react";

import HomePage from "@/app/page";

test("shows waiting status before first tick", () => {
  render(<HomePage />);

  expect(screen.getByText("AutoTrader Dashboard")).toBeInTheDocument();
  expect(screen.getByText("waiting-first-tick")).toBeInTheDocument();
});
