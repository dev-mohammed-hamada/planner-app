import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { WeeklySpread } from "@/components/planner/weekly-spread";

describe("WeeklySpread", () => {
  it("renders Saturday through Friday and Weekly Notes", () => {
    render(<WeeklySpread items={[]} weekStartDate="2026-05-16" weeklyNote="" />);

    expect(screen.getByText(/Saturday/i)).toBeInTheDocument();
    expect(screen.getByText(/Sunday/i)).toBeInTheDocument();
    expect(screen.getByText(/Monday/i)).toBeInTheDocument();
    expect(screen.getByText(/Tuesday/i)).toBeInTheDocument();
    expect(screen.getByText(/Wednesday/i)).toBeInTheDocument();
    expect(screen.getByText(/Thursday/i)).toBeInTheDocument();
    expect(screen.getByText(/Friday/i)).toBeInTheDocument();
    expect(screen.getByText(/Weekly Notes/i)).toBeInTheDocument();
  });
});
