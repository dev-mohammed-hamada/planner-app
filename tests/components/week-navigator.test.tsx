import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { WeekNavigator } from "@/components/planner/week-navigator";

describe("WeekNavigator", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders prev and next hrefs anchored on the shown week", () => {
    render(
      <WeekNavigator
        weekStartDate="2026-08-15"
        currentWeekStartDate="2026-08-15"
        variant="header"
      />,
    );

    const prev = screen.getByRole("link", { name: /previous week/i });
    const next = screen.getByRole("link", { name: /next week/i });

    expect(prev).toHaveAttribute("href", "/planner?week=2026-08-08");
    expect(next).toHaveAttribute("href", "/planner?week=2026-08-22");
  });

  it("hides the Today link when already on the current week", () => {
    render(
      <WeekNavigator
        weekStartDate="2026-08-15"
        currentWeekStartDate="2026-08-15"
        variant="header"
      />,
    );

    expect(screen.queryByRole("link", { name: /today/i })).not.toBeInTheDocument();
  });

  it("shows a Today link back to /planner when off the current week", () => {
    render(
      <WeekNavigator
        weekStartDate="2026-08-22"
        currentWeekStartDate="2026-08-15"
        variant="header"
      />,
    );

    const today = screen.getByRole("link", { name: /today/i });
    expect(today).toHaveAttribute("href", "/planner");
  });

  it("shows the human-readable week label in header variant", () => {
    render(
      <WeekNavigator
        weekStartDate="2026-08-15"
        currentWeekStartDate="2026-08-15"
        variant="header"
      />,
    );

    expect(screen.getByText(/Week of August 15/i)).toBeInTheDocument();
  });

  it("omits the label in footer variant", () => {
    render(
      <WeekNavigator
        weekStartDate="2026-08-15"
        currentWeekStartDate="2026-08-15"
        variant="footer"
      />,
    );

    expect(screen.queryByText(/Week of August 15/i)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /previous week/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /next week/i })).toBeInTheDocument();
  });
});
