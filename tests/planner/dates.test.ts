import { describe, expect, it } from "vitest";

import {
  getSaturdayWeekStart,
  inferBlockFromHour,
  resolveWeekParam,
} from "@/lib/planner/dates";

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

describe("resolveWeekParam", () => {
  it("passes through a Saturday input", () => {
    expect(resolveWeekParam("2026-05-16", "2026-08-21")).toBe("2026-05-16");
  });

  it("snaps a midweek input to the enclosing Saturday", () => {
    expect(resolveWeekParam("2026-05-20", "2026-08-21")).toBe("2026-05-16");
  });

  it("falls back to today's Saturday when input is undefined", () => {
    expect(resolveWeekParam(undefined, "2026-08-21")).toBe("2026-08-15");
  });

  it("falls back to today's Saturday when input is garbage", () => {
    expect(resolveWeekParam("not-a-date", "2026-08-21")).toBe("2026-08-15");
  });

  it("falls back to today's Saturday when input is a malformed ISO", () => {
    expect(resolveWeekParam("2026-99-99", "2026-08-21")).toBe("2026-08-15");
  });

  it("falls back to today's Saturday when input is an empty string", () => {
    expect(resolveWeekParam("", "2026-08-21")).toBe("2026-08-15");
  });
});
