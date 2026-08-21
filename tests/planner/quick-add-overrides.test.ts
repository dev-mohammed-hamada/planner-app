import { describe, expect, it } from "vitest";

import { applyQuickAddOverrides } from "@/lib/planner/quick-add-overrides";
import type { ParsedCapture } from "@/lib/planner/types";

const baseItem: ParsedCapture = {
  title: "Call Sarah",
  originalText: "tomorrow call Sarah at 2pm",
  itemType: "task",
  itemDate: "2026-05-26",
  itemTime: "14:00",
  block: "afternoon",
  bucket: "weekly_spread",
};

describe("applyQuickAddOverrides", () => {
  it("applies date, time, block, bucket, and item type overrides", () => {
    const result = applyQuickAddOverrides(baseItem, {
      block: "morning",
      bucket: "weekly_spread",
      itemDate: "2026-05-27",
      itemTime: "09:30",
      itemType: "appointment",
    });

    expect(result).toEqual({
      ...baseItem,
      block: "morning",
      bucket: "weekly_spread",
      itemDate: "2026-05-27",
      itemTime: "09:30",
      itemType: "appointment",
    });
  });

  it("moves items without a date to inbox and none block", () => {
    const result = applyQuickAddOverrides(baseItem, {
      itemDate: null,
      itemTime: null,
    });

    expect(result.bucket).toBe("inbox");
    expect(result.block).toBe("none");
    expect(result.itemDate).toBeNull();
    expect(result.itemTime).toBeNull();
  });

  it("rejects invalid time strings", () => {
    expect(() =>
      applyQuickAddOverrides(baseItem, {
        itemTime: "9:30",
      }),
    ).toThrow("Time must use HH:MM format.");
  });
});
