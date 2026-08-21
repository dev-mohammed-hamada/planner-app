import type { JSX } from "react";

import {
  updateCalendarConnectionAction,
  updateDisplayPreferencesAction,
  updateReminderDefinitionAction,
} from "@/app/(app)/settings/actions";
import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/ui/field";
import { Section, SectionRow } from "@/components/ui/section";
import { Toggle } from "@/components/ui/toggle";

export type DisplayPreferencesProp = {
  theme: "light" | "dark" | "system";
  default_calendar_view: "day";
  quick_add_default_bucket: "weekly_spread" | "inbox" | "future_notes";
};

const THEME_OPTIONS: ReadonlyArray<{
  label: string;
  value: DisplayPreferencesProp["theme"];
}> = [
  { label: "Light", value: "light" },
  { label: "Dark", value: "dark" },
  { label: "System", value: "system" },
];

const BUCKET_OPTIONS: ReadonlyArray<{
  label: string;
  value: DisplayPreferencesProp["quick_add_default_bucket"];
}> = [
  { label: "Weekly spread", value: "weekly_spread" },
  { label: "Inbox", value: "inbox" },
  { label: "Future notes", value: "future_notes" },
];

export function DisplaySettingsSection({
  preferences,
}: {
  preferences: DisplayPreferencesProp;
}): JSX.Element {
  return (
    <Section title="Display">
      <SectionRow
        title="Theme"
        description="Match the device, or override per preference."
      >
        <form
          action={updateDisplayPreferencesAction}
          className="flex flex-wrap items-center gap-3"
        >
          {THEME_OPTIONS.map((option) => {
            const id = `theme-${option.value}`;
            return (
              <label
                className="inline-flex items-center gap-2 text-sm"
                htmlFor={id}
                key={option.value}
              >
                <input
                  defaultChecked={preferences.theme === option.value}
                  id={id}
                  name="theme"
                  type="radio"
                  value={option.value}
                />
                {option.label}
              </label>
            );
          })}
          <Button type="submit" variant="quiet">
            Save theme
          </Button>
        </form>
      </SectionRow>

      <SectionRow
        title="Quick Add default"
        description="Where new captures land when no override is given."
      >
        <form
          action={updateDisplayPreferencesAction}
          className="flex items-end gap-3"
        >
          <SelectField
            defaultValue={preferences.quick_add_default_bucket}
            label="Bucket"
            name="quick_add_default_bucket"
          >
            {BUCKET_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </SelectField>
          <Button type="submit" variant="quiet">
            Save
          </Button>
        </form>
      </SectionRow>
    </Section>
  );
}

export type ReminderRow = {
  enabled: boolean;
  local_time: string;
  reminder_type: "evening_planning" | "morning_check_in" | "weekly_reset";
};

const REMINDER_LABELS: Record<ReminderRow["reminder_type"], string> = {
  evening_planning: "Evening planning",
  morning_check_in: "Morning check-in",
  weekly_reset: "Weekly reset",
};

function trimSeconds(localTime: string): string {
  return localTime.length >= 5 ? localTime.slice(0, 5) : localTime;
}

export function ReminderSettingsSection({
  reminders,
}: {
  reminders: ReminderRow[];
}): JSX.Element {
  return (
    <Section title="Reminders">
      {reminders.map((reminder) => {
        const label = REMINDER_LABELS[reminder.reminder_type];
        const displayTime = trimSeconds(reminder.local_time);

        return (
          <SectionRow key={reminder.reminder_type} title={label}>
            <form
              action={updateReminderDefinitionAction}
              className="flex items-center gap-3"
            >
              <input
                name="reminder_type"
                type="hidden"
                value={reminder.reminder_type}
              />
              <label className="flex items-center gap-2 text-sm">
                <span className="text-[var(--tm-text-muted)]">Time</span>
                <input
                  className="tm-field h-9 px-2 py-1 text-sm"
                  defaultValue={displayTime}
                  name="local_time"
                  type="time"
                />
              </label>
              <Toggle
                aria-label={label}
                defaultChecked={reminder.enabled}
                label={`${label} toggle`}
                name="enabled"
              />
              <Button type="submit" variant="quiet">
                Save
              </Button>
            </form>
          </SectionRow>
        );
      })}
    </Section>
  );
}

export type CalendarConnectionProp = {
  last_synced_at: string | null;
  provider: "google";
  provider_account_email: string | null;
  status: "not_connected" | "connected" | "error" | "revoked";
};

const STATUS_LABELS: Record<CalendarConnectionProp["status"], string> = {
  not_connected: "Not connected",
  connected: "Connected",
  error: "Connection error",
  revoked: "Access revoked",
};

const PROVIDER_LABELS: Record<CalendarConnectionProp["provider"], string> = {
  google: "Google Calendar",
};

function formatSyncedAt(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}

export function CalendarSettingsSection({
  connection,
}: {
  connection: CalendarConnectionProp;
}): JSX.Element {
  const providerLabel = PROVIDER_LABELS[connection.provider];
  const statusText = STATUS_LABELS[connection.status];
  const lastSynced = formatSyncedAt(connection.last_synced_at);
  const isConnected = connection.status === "connected";

  return (
    <Section title="Calendar Sync">
      <SectionRow title={providerLabel}>
        <div className="flex flex-col items-end gap-2 text-sm">
          <span className="font-medium">{statusText}</span>
          {connection.provider_account_email ? (
            <span className="text-[var(--tm-text-muted)]">
              {connection.provider_account_email}
            </span>
          ) : null}
          {lastSynced ? (
            <span className="text-[var(--tm-text-muted)]">
              Last synced {lastSynced}
            </span>
          ) : null}
          <form action={updateCalendarConnectionAction}>
            <input
              name="status"
              type="hidden"
              value={isConnected ? "revoked" : "connected"}
            />
            <Button
              type="submit"
              variant={isConnected ? "destructive" : "primary"}
            >
              {isConnected ? "Disconnect" : "Connect"}
            </Button>
          </form>
        </div>
      </SectionRow>
    </Section>
  );
}
