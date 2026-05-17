import { describe, expect, it, vi } from "vitest";

import { saveParsedCapture } from "@/lib/planner/planner-repository";
import type { ParsedCapture } from "@/lib/planner/types";

describe("saveParsedCapture", () => {
  const parsedAppointment: ParsedCapture = {
    title: "dentist",
    originalText: "Tuesday 4pm dentist",
    itemType: "appointment",
    itemDate: "2026-05-19",
    itemTime: "16:00",
    block: "afternoon",
    bucket: "weekly_spread",
  };

  it("inserts a parsed appointment into planner_items", async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    const from = vi.fn().mockReturnValue({ insert });
    const supabase = { from };

    await saveParsedCapture(supabase, "user-123", parsedAppointment);

    expect(from).toHaveBeenCalledWith("planner_items");
    expect(insert).toHaveBeenCalledWith({
      user_id: "user-123",
      title: "dentist",
      original_text: "Tuesday 4pm dentist",
      item_type: "appointment",
      item_date: "2026-05-19",
      item_time: "16:00",
      block: "afternoon",
      bucket: "weekly_spread",
      source: "telegram",
    });
  });

  it("throws insert errors", async () => {
    const error = new Error("insert failed");
    const insert = vi.fn().mockResolvedValue({ error });
    const from = vi.fn().mockReturnValue({ insert });
    const supabase = { from };

    await expect(saveParsedCapture(supabase, "user-123", parsedAppointment)).rejects.toThrow(error);
  });
});
