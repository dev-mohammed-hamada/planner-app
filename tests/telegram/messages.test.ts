import { describe, expect, it } from "vitest";

import { aiFailureMessage, captureSavedMessage } from "@/lib/telegram/messages";

describe("captureSavedMessage", () => {
  it("returns singular text for one item", () => {
    expect(captureSavedMessage(1)).toBe("Saved to your planner.");
  });

  it("returns plural text with count for multiple items", () => {
    expect(captureSavedMessage(2)).toBe("Saved 2 items to your planner.");
    expect(captureSavedMessage(5)).toBe("Saved 5 items to your planner.");
  });
});

describe("aiFailureMessage", () => {
  it("returns the failure string", () => {
    expect(aiFailureMessage()).toBe(
      "AI parsing failed — saved to inbox. Open it to fix the date manually.",
    );
  });
});
