import { describe, expect, it, vi } from "vitest";

import { captureFromText, shouldEscalateToAi } from "@/lib/planner/capture";
import type { ParsedCapture } from "@/lib/planner/types";

function regexInbox(text: string): ParsedCapture {
  return {
    title: text,
    originalText: text,
    itemType: "task",
    itemDate: null,
    itemTime: null,
    block: "none",
    bucket: "inbox",
  };
}

function regexDated(text: string): ParsedCapture {
  return {
    title: text,
    originalText: text,
    itemType: "task",
    itemDate: "2026-05-19",
    itemTime: null,
    block: "unsorted",
    bucket: "weekly_spread",
  };
}

describe("shouldEscalateToAi", () => {
  it("escalates when regex returns inbox", () => {
    expect(shouldEscalateToAi(regexInbox("buy milk"), "buy milk")).toBe(true);
  });

  it("does not escalate when regex returns weekly_spread with single-verb text", () => {
    expect(shouldEscalateToAi(regexDated("buy milk tomorrow"), "buy milk tomorrow")).toBe(false);
  });

  it("does not escalate when regex returns future_notes", () => {
    const future: ParsedCapture = {
      ...regexInbox("someday refactor X"),
      bucket: "future_notes",
    };
    expect(shouldEscalateToAi(future, "someday refactor X")).toBe(false);
  });

  it("escalates when text has separator and multiple verbs even if regex found a date", () => {
    expect(
      shouldEscalateToAi(regexDated("buy milk and call mom tomorrow"), "buy milk and call mom tomorrow"),
    ).toBe(true);
  });

  it("does not escalate on dated text that lacks both a separator and a second verb", () => {
    expect(shouldEscalateToAi(regexDated("workout tomorrow"), "workout tomorrow")).toBe(false);
  });
});

describe("captureFromText", () => {
  const baseDate = "2026-05-18";

  it("returns regex result without calling AI when not escalated", async () => {
    const aiParse = vi.fn();
    const outcome = await captureFromText("workout tomorrow", baseDate, { aiParse });

    expect(outcome.items).toHaveLength(1);
    expect(outcome.source).toBe("regex");
    expect(outcome.items[0].bucket).toBe("weekly_spread");
    expect(aiParse).not.toHaveBeenCalled();
  });

  it("calls AI when regex returns inbox and uses AI items", async () => {
    const aiItems: ParsedCapture[] = [
      {
        title: "buy milk",
        originalText: "tommorow buy milk",
        itemType: "task",
        itemDate: "2026-05-19",
        itemTime: null,
        block: "unsorted",
        bucket: "weekly_spread",
      },
    ];
    const aiParse = vi.fn().mockResolvedValue(aiItems);

    const outcome = await captureFromText("tommorow buy milk", baseDate, { aiParse });

    expect(outcome.source).toBe("ai");
    expect(outcome.items).toEqual(aiItems);
    expect(aiParse).toHaveBeenCalledWith("tommorow buy milk", baseDate);
  });

  it("propagates AI errors", async () => {
    const { AiParseError } = await import("@/lib/planner/ai-capture-parser");
    const aiParse = vi.fn().mockRejectedValue(new AiParseError("boom"));

    await expect(captureFromText("tommorow buy milk", baseDate, { aiParse })).rejects.toBeInstanceOf(
      AiParseError,
    );
  });

  it("calls AI when text matches multi-item heuristic even on dated regex result", async () => {
    const aiParse = vi.fn().mockResolvedValue([]);
    // Force a non-empty AI return so we can observe the call shape.
    aiParse.mockResolvedValue([
      {
        title: "buy milk",
        originalText: "buy milk and call mom tomorrow",
        itemType: "task",
        itemDate: "2026-05-19",
        itemTime: null,
        block: "unsorted",
        bucket: "weekly_spread",
      },
      {
        title: "call mom",
        originalText: "buy milk and call mom tomorrow",
        itemType: "appointment",
        itemDate: "2026-05-19",
        itemTime: null,
        block: "unsorted",
        bucket: "weekly_spread",
      },
    ]);

    const outcome = await captureFromText("buy milk and call mom tomorrow", baseDate, { aiParse });

    expect(aiParse).toHaveBeenCalledOnce();
    expect(outcome.source).toBe("ai");
    expect(outcome.items).toHaveLength(2);
  });
});
