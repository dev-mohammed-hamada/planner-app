import { Temporal } from "@js-temporal/polyfill";

import { inferBlockFromHour } from "./dates";
import type { DayBlock, ParsedCapture } from "./types";

const VAGUE_FUTURE_PATTERN = /\b(next month|someday|eventually)\b/i;
const BLOCK_PATTERN = /\b(morning|afternoon|evening)\b/i;
const TIME_PATTERN = /\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i;
const WEEKDAYS = new Map([
  ["monday", 1],
  ["tuesday", 2],
  ["wednesday", 3],
  ["thursday", 4],
  ["friday", 5],
  ["saturday", 6],
  ["sunday", 7],
]);

type DateMatch = {
  dateISO: string;
  token: string;
};

export function parseCapture(text: string, baseDateISO: string): ParsedCapture {
  const originalText = text;
  const trimmedText = text.trim();

  if (VAGUE_FUTURE_PATTERN.test(trimmedText)) {
    return buildParsedCapture({
      title: trimmedText,
      originalText,
      itemType: "note",
      itemDate: null,
      itemTime: null,
      block: "none",
      bucket: "future_notes",
    });
  }

  const dateMatch = findDate(trimmedText, baseDateISO);

  if (!dateMatch) {
    return buildParsedCapture({
      title: trimmedText,
      originalText,
      itemType: "task",
      itemDate: null,
      itemTime: null,
      block: "none",
      bucket: "inbox",
    });
  }

  const parsedTime = parseTime(trimmedText.match(TIME_PATTERN));
  const normalizedTime = parsedTime?.normalizedTime ?? null;
  const block = inferBlock(trimmedText, normalizedTime);

  return buildParsedCapture({
    title: cleanTitle(trimmedText, dateMatch.token, parsedTime?.token ?? null),
    originalText,
    itemType: normalizedTime ? "appointment" : "task",
    itemDate: dateMatch.dateISO,
    itemTime: normalizedTime,
    block,
    bucket: "weekly_spread",
  });
}

function buildParsedCapture(capture: ParsedCapture): ParsedCapture {
  return capture;
}

function findDate(text: string, baseDateISO: string): DateMatch | null {
  const baseDate = Temporal.PlainDate.from(baseDateISO);

  if (/\btomorrow\b/i.test(text)) {
    return {
      dateISO: baseDate.add({ days: 1 }).toString(),
      token: "tomorrow",
    };
  }

  if (/\btoday\b/i.test(text)) {
    return {
      dateISO: baseDate.toString(),
      token: "today",
    };
  }

  for (const [weekday, dayOfWeek] of WEEKDAYS) {
    if (new RegExp(`\\b${weekday}\\b`, "i").test(text)) {
      const daysUntilWeekday = (dayOfWeek - baseDate.dayOfWeek + 7) % 7 || 7;

      return {
        dateISO: baseDate.add({ days: daysUntilWeekday }).toString(),
        token: weekday,
      };
    }
  }

  return null;
}

function parseTime(match: RegExpMatchArray | null): { normalizedTime: string; token: string } | null {
  if (!match) {
    return null;
  }

  const hourText = match[1];
  const minuteText = match[2] ?? "00";
  const meridiem = match[3]?.toLowerCase() ?? null;
  let hour = Number(hourText);
  const minute = Number(minuteText);

  if (minute > 59) {
    return null;
  }

  if (!meridiem && hour > 23) {
    return null;
  }

  if (meridiem && (hour < 1 || hour > 12)) {
    return null;
  }

  if (meridiem === "pm" && hour !== 12) {
    hour += 12;
  }

  if (meridiem === "am" && hour === 12) {
    hour = 0;
  }

  return {
    normalizedTime: `${hour.toString().padStart(2, "0")}:${minuteText}`,
    token: match[0],
  };
}

function inferBlock(text: string, normalizedTime: string | null): DayBlock {
  const blockMatch = text.match(BLOCK_PATTERN);

  if (blockMatch) {
    return blockMatch[1].toLowerCase() as DayBlock;
  }

  if (normalizedTime) {
    return inferBlockFromHour(Number(normalizedTime.slice(0, 2)));
  }

  return "unsorted";
}

function cleanTitle(text: string, dateToken: string, timeToken: string | null): string {
  let title = text
    .replace(new RegExp(`\\b${dateToken}\\b`, "i"), " ")
    .replace(BLOCK_PATTERN, " ");

  if (timeToken) {
    title = title.replace(timeToken, " ");
  }

  return title.replace(/\s+/g, " ").trim();
}
