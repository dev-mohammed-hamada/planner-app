import { describe, expect, it } from "vitest";

import { reminderMessage } from "@/lib/reminders/reminder-messages";

describe("reminderMessage", () => {
  it("uses the approved morning check-in text", () => {
    expect(reminderMessage("morning_check_in")).toBe(
      "Open today's notebook section. Check appointments, choose the first thing for the morning, and start gently.",
    );
  });

  it("uses the approved evening planning text", () => {
    expect(reminderMessage("evening_planning")).toBe(
      "Plan tomorrow in your notebook: appointments, tasks, morning, afternoon, evening, and anything to prepare before sleep.",
    );
  });

  it("uses the approved weekly reset text", () => {
    expect(reminderMessage("weekly_reset")).toBe(
      "Weekly reset: prepare your 8-section spread for Saturday through Friday. Review upcoming appointments, unfinished tasks, Inbox, and Future Notes.",
    );
  });

  it("adds saved-item bullets when summary lines are present", () => {
    expect(reminderMessage("morning_check_in", ["Dentist at 4pm", "Buy notebooks"])).toContain(
      "Saved items:\n- Dentist at 4pm\n- Buy notebooks",
    );
  });
});
