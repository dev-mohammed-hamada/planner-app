import { describe, expect, it } from "vitest";

import { isReminderDue, reminderSlotISO } from "@/lib/reminders/due-reminders";

describe("isReminderDue", () => {
  it("returns true for a daily 22:00 Asia/Gaza reminder inside the current cron window", () => {
    expect(
      isReminderDue({
        reminderType: "evening_planning",
        localTime: "22:00",
        dayOfWeek: null,
        timezone: "Asia/Gaza",
        nowISO: "2026-05-17T19:00:30Z",
      }),
    ).toBe(true);
  });

  it("returns true for a Friday weekly 22:15 Asia/Gaza reminder at the Friday slot", () => {
    expect(
      isReminderDue({
        reminderType: "weekly_reset",
        localTime: "22:15",
        dayOfWeek: 5,
        timezone: "Asia/Gaza",
        nowISO: "2026-05-22T19:15:00Z",
      }),
    ).toBe(true);
  });
});

describe("reminderSlotISO", () => {
  it("floors an instant to the current five-minute UTC slot", () => {
    expect(reminderSlotISO("2026-05-17T19:03:30Z")).toBe("2026-05-17T19:00:00Z");
  });
});
