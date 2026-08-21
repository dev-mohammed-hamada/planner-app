import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CalendarDayView } from "@/components/calendar/day-view";

describe("CalendarDayView", () => {
  it("renders timed, untimed, completed, and empty ruled rows", () => {
    render(
      <CalendarDayView
        dateISO="2026-05-26"
        items={[
          {
            id: "1",
            title: "Morning sync",
            item_date: "2026-05-26",
            item_time: "09:00:00",
            block: "morning",
            status: "active",
          },
          {
            id: "2",
            title: "Draft roadmap",
            item_date: "2026-05-26",
            item_time: null,
            block: "unsorted",
            status: "completed",
          },
        ]}
      />,
    );

    expect(screen.getByRole("heading", { name: "Tuesday" })).toBeInTheDocument();
    expect(screen.getByText("09:00")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Morning sync")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Draft roadmap")).toHaveClass("line-through");
    expect(screen.getAllByTestId("empty-calendar-row")).toHaveLength(4);
  });
});
