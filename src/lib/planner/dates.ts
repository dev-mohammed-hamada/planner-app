import { Temporal } from "@js-temporal/polyfill";

import type { DayBlock } from "./types";

export function getSaturdayWeekStart(dateISO: string): string {
  const date = Temporal.PlainDate.from(dateISO);
  const daysSinceSaturday = (date.dayOfWeek + 1) % 7;

  return date.subtract({ days: daysSinceSaturday }).toString();
}

export function inferBlockFromHour(hour: number): DayBlock {
  if (hour < 12) {
    return "morning";
  }

  if (hour < 18) {
    return "afternoon";
  }

  return "evening";
}

export function todayInTimezone(timezone: string): string {
  return Temporal.Now.zonedDateTimeISO(timezone).toPlainDate().toString();
}
