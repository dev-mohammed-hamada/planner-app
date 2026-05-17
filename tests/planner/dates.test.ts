import { describe, expect, it } from "vitest";

import { getSaturdayWeekStart, inferBlockFromHour } from "@/lib/planner/dates";

describe("planner date helpers", () => {
  it("returns the Saturday that starts the week for a midweek date", () => {
    expect(getSaturdayWeekStart("2026-05-20")).toBe("2026-05-16");
  });

  it("returns the same date when the date is already Saturday", () => {
    expect(getSaturdayWeekStart("2026-05-23")).toBe("2026-05-23");
  });

  it("infers the day block from the hour", () => {
    expect(inferBlockFromHour(9)).toBe("morning");
    expect(inferBlockFromHour(15)).toBe("afternoon");
    expect(inferBlockFromHour(20)).toBe("evening");
  });
});
