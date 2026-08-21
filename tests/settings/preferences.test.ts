import { describe, expect, it, vi } from "vitest";

import {
  getDisplayPreferences,
  updateDisplayPreferences,
  updateReminderDefinition,
} from "@/lib/settings/preferences";

describe("settings preferences", () => {
  it("returns safe display defaults when no row exists", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const eq = vi.fn().mockReturnValue({ maybeSingle });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ select });

    const result = await getDisplayPreferences({ from } as never, "user-123");

    expect(from).toHaveBeenCalledWith("user_preferences");
    expect(result).toEqual({
      default_calendar_view: "day",
      quick_add_default_bucket: "weekly_spread",
      theme: "system",
    });
  });

  it("upserts display preferences for the user", async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const from = vi.fn().mockReturnValue({ upsert });

    await updateDisplayPreferences({ from } as never, "user-123", {
      theme: "dark",
    });

    expect(from).toHaveBeenCalledWith("user_preferences");
    expect(upsert).toHaveBeenCalledWith(
      {
        theme: "dark",
        user_id: "user-123",
      },
      { onConflict: "user_id" },
    );
  });

  it("updates existing reminder definitions", async () => {
    const secondEq = vi.fn().mockResolvedValue({ error: null });
    const firstEq = vi.fn().mockReturnValue({ eq: secondEq });
    const update = vi.fn().mockReturnValue({ eq: firstEq });
    const from = vi.fn().mockReturnValue({ update });

    await updateReminderDefinition({ from } as never, "user-123", "morning_check_in", {
      enabled: false,
      local_time: "08:30",
    });

    expect(from).toHaveBeenCalledWith("reminder_definitions");
    expect(update).toHaveBeenCalledWith({
      enabled: false,
      local_time: "08:30",
    });
    expect(firstEq).toHaveBeenCalledWith("user_id", "user-123");
    expect(secondEq).toHaveBeenCalledWith("reminder_type", "morning_check_in");
  });
});
