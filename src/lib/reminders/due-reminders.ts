import { Temporal } from "@js-temporal/polyfill";

type IsReminderDueInput = {
  reminderType: string;
  localTime: string;
  dayOfWeek: number | null;
  timezone: string;
  nowISO: string;
};

const CRON_WINDOW_MINUTES = 5;

export function reminderSlotISO(nowISO: string): string {
  const instant = Temporal.Instant.from(nowISO);
  const slotMs = Math.floor(instant.epochMilliseconds / (CRON_WINDOW_MINUTES * 60_000)) * CRON_WINDOW_MINUTES * 60_000;

  return Temporal.Instant.fromEpochMilliseconds(slotMs).toString();
}

export function isReminderDue({ localTime, dayOfWeek, timezone, nowISO }: IsReminderDueInput): boolean {
  const slot = Temporal.Instant.from(reminderSlotISO(nowISO)).toZonedDateTimeISO(timezone);
  const localSlotStart = slot.toPlainDateTime();
  const localSlotEnd = localSlotStart.add({ minutes: CRON_WINDOW_MINUTES });
  const candidate = localSlotStart.toPlainDate().toPlainDateTime(parseLocalTime(localTime));

  if (dayOfWeek !== null && dayOfWeek !== jsDayOfWeek(slot.dayOfWeek)) {
    return false;
  }

  return Temporal.PlainDateTime.compare(candidate, localSlotStart) >= 0
    && Temporal.PlainDateTime.compare(candidate, localSlotEnd) < 0;
}

function parseLocalTime(localTime: string): Temporal.PlainTime {
  const [hour = "0", minute = "0", second = "0"] = localTime.split(":");

  return new Temporal.PlainTime(Number(hour), Number(minute), Number(second));
}

function jsDayOfWeek(temporalDayOfWeek: number): number {
  return temporalDayOfWeek === 7 ? 0 : temporalDayOfWeek;
}
