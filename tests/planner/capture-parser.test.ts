import { describe, expect, it } from "vitest";

import { parseCapture } from "@/lib/planner/capture-parser";

describe("parseCapture", () => {
  it("parses a dated morning task into the weekly spread", () => {
    expect(parseCapture("Tomorrow morning submit report", "2026-05-17")).toEqual({
      title: "submit report",
      originalText: "Tomorrow morning submit report",
      itemType: "task",
      itemDate: "2026-05-18",
      itemTime: null,
      block: "morning",
      bucket: "weekly_spread",
    });
  });

  it("parses a dated time capture as an appointment with an inferred block", () => {
    expect(parseCapture("Tuesday 4pm dentist", "2026-05-17")).toEqual({
      title: "dentist",
      originalText: "Tuesday 4pm dentist",
      itemType: "appointment",
      itemDate: "2026-05-19",
      itemTime: "16:00",
      block: "afternoon",
      bucket: "weekly_spread",
    });
  });

  it("parses a dated 24-hour time capture as an appointment", () => {
    expect(parseCapture("Tuesday 16:30 dentist", "2026-05-17")).toEqual({
      title: "dentist",
      originalText: "Tuesday 16:30 dentist",
      itemType: "appointment",
      itemDate: "2026-05-19",
      itemTime: "16:30",
      block: "afternoon",
      bucket: "weekly_spread",
    });
  });

  it("does not treat invalid 24-hour times as appointment times", () => {
    expect(parseCapture("Tuesday 25:00 impossible", "2026-05-17")).toEqual({
      title: "25:00 impossible",
      originalText: "Tuesday 25:00 impossible",
      itemType: "task",
      itemDate: "2026-05-19",
      itemTime: null,
      block: "unsorted",
      bucket: "weekly_spread",
    });
  });

  it("keeps vague future captures in future notes without assigning a date", () => {
    expect(parseCapture("Renew passport next month", "2026-05-17")).toEqual({
      title: "Renew passport next month",
      originalText: "Renew passport next month",
      itemType: "note",
      itemDate: null,
      itemTime: null,
      block: "none",
      bucket: "future_notes",
    });
  });

  it("keeps undated captures in the inbox", () => {
    expect(parseCapture("Buy printer ink", "2026-05-17")).toEqual({
      title: "Buy printer ink",
      originalText: "Buy printer ink",
      itemType: "task",
      itemDate: null,
      itemTime: null,
      block: "none",
      bucket: "inbox",
    });
  });
});
