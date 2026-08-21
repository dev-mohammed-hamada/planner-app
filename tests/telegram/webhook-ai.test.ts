import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/telegram/messages", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/telegram/messages")>("@/lib/telegram/messages");
  return {
    ...actual,
    sendTelegramMessage: vi.fn().mockResolvedValue(undefined),
  };
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/planner/capture", () => ({
  captureFromText: vi.fn(),
}));

vi.mock("@/lib/planner/capture-parser", () => ({
  parseCapture: vi.fn(),
}));

vi.mock("@/lib/planner/planner-repository", () => ({
  saveParsedCapture: vi.fn().mockResolvedValue(undefined),
}));

import { POST } from "@/app/api/telegram/webhook/route";
import { captureFromText } from "@/lib/planner/capture";
import { parseCapture } from "@/lib/planner/capture-parser";
import { saveParsedCapture } from "@/lib/planner/planner-repository";
import { createClient } from "@/lib/supabase/server";
import {
  aiFailureMessage,
  captureSavedMessage,
  sendTelegramMessage,
} from "@/lib/telegram/messages";
import { AiParseError } from "@/lib/planner/ai-capture-parser";

function buildSupabase(profileTimezone: string | null, linkedUserId: string | null) {
  const link = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi
      .fn()
      .mockResolvedValueOnce({
        data: linkedUserId ? { user_id: linkedUserId } : null,
        error: null,
      })
      .mockResolvedValueOnce({
        data: { timezone: profileTimezone },
        error: null,
      }),
  };
  return {
    from: vi.fn(() => link),
  };
}

function buildRequest(text: string) {
  return new Request("https://example.com/api/telegram/webhook", {
    method: "POST",
    headers: { "x-telegram-bot-api-secret-token": "ignored" },
    body: JSON.stringify({
      message: { text, chat: { id: 42 }, from: { id: 7 } },
    }),
  });
}

describe("telegram webhook AI integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("saves all AI items and replies with count", async () => {
    const previousSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
    delete process.env.TELEGRAM_WEBHOOK_SECRET;

    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(
      buildSupabase("Asia/Gaza", "user-1"),
    );
    (captureFromText as ReturnType<typeof vi.fn>).mockResolvedValue({
      source: "ai",
      items: [
        {
          title: "buy milk",
          originalText: "tommorow buy milk and call mom at 4pm",
          itemType: "task",
          itemDate: "2026-05-19",
          itemTime: null,
          block: "unsorted",
          bucket: "weekly_spread",
        },
        {
          title: "call mom",
          originalText: "tommorow buy milk and call mom at 4pm",
          itemType: "appointment",
          itemDate: "2026-05-19",
          itemTime: "16:00",
          block: "afternoon",
          bucket: "weekly_spread",
        },
      ],
    });

    const response = await POST(
      buildRequest("tommorow buy milk and call mom at 4pm") as never,
    );

    expect(response.status).toBe(200);
    expect(saveParsedCapture).toHaveBeenCalledTimes(2);
    expect(sendTelegramMessage).toHaveBeenLastCalledWith(42, captureSavedMessage(2));

    if (previousSecret !== undefined) {
      process.env.TELEGRAM_WEBHOOK_SECRET = previousSecret;
    }
  });

  it("falls back to regex and replies with AI failure message when captureFromText throws", async () => {
    const previousSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
    delete process.env.TELEGRAM_WEBHOOK_SECRET;

    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(
      buildSupabase("Asia/Gaza", "user-1"),
    );
    (captureFromText as ReturnType<typeof vi.fn>).mockRejectedValue(new AiParseError("boom"));
    (parseCapture as ReturnType<typeof vi.fn>).mockReturnValue({
      title: "tommorow buy milk",
      originalText: "tommorow buy milk",
      itemType: "task",
      itemDate: null,
      itemTime: null,
      block: "none",
      bucket: "inbox",
    });

    const response = await POST(buildRequest("tommorow buy milk") as never);

    expect(response.status).toBe(200);
    expect(saveParsedCapture).toHaveBeenCalledTimes(1);
    expect(parseCapture).toHaveBeenCalledWith("tommorow buy milk", expect.any(String));
    expect(sendTelegramMessage).toHaveBeenLastCalledWith(42, aiFailureMessage());

    if (previousSecret !== undefined) {
      process.env.TELEGRAM_WEBHOOK_SECRET = previousSecret;
    }
  });
});
