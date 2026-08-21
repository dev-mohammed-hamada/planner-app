import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import {
  CalendarSettingsSection,
  DisplaySettingsSection,
  ReminderSettingsSection,
} from "@/components/settings/settings-sections";

describe("settings sections", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders display preferences", () => {
    render(
      <DisplaySettingsSection
        preferences={{
          default_calendar_view: "day",
          quick_add_default_bucket: "weekly_spread",
          theme: "system",
        }}
      />,
    );

    expect(screen.getByRole("heading", { name: "Display" })).toBeInTheDocument();
    expect(screen.getByLabelText("System")).toBeChecked();
  });

  it("renders reminder preferences from reminder definitions", () => {
    render(
      <ReminderSettingsSection
        reminders={[
          {
            enabled: true,
            local_time: "09:00:00",
            reminder_type: "morning_check_in",
          },
        ]}
      />,
    );

    expect(screen.getByRole("heading", { name: "Reminders" })).toBeInTheDocument();
    expect(screen.getByText("Morning check-in")).toBeInTheDocument();
    expect(
      screen.getByRole("switch", { name: "Morning check-in" }),
    ).toBeChecked();
  });

  it("renders calendar connection state", () => {
    render(
      <CalendarSettingsSection
        connection={{
          last_synced_at: null,
          provider: "google",
          provider_account_email: null,
          status: "not_connected",
        }}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Calendar Sync" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Not connected")).toBeInTheDocument();
  });
});
