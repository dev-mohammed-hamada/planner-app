import { afterEach, describe, expect, it, vi } from "vitest";

import {
  captureSavedMessage,
  linkedMessage,
  sendTelegramMessage,
  unlinkedMessage,
} from "@/lib/telegram/messages";

describe("telegram messages", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("returns the unlinked message text", () => {
    expect(unlinkedMessage()).toBe("Send your six-digit linking code from the app to connect Telegram.");
  });

  it("returns the saved capture message text", () => {
    expect(captureSavedMessage()).toBe("Saved to your planner.");
  });

  it("returns the linked message text", () => {
    expect(linkedMessage()).toBe("Telegram is linked to your planner.");
  });

  it("posts a Telegram message with the bot token", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "token-123");
    vi.stubGlobal("fetch", fetchMock);

    await sendTelegramMessage(42, "hello");

    expect(fetchMock).toHaveBeenCalledWith("https://api.telegram.org/bottoken-123/sendMessage", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: 42, text: "hello" }),
    });
  });

  it("throws when the bot token is missing", async () => {
    await expect(sendTelegramMessage(42, "hello")).rejects.toThrow("TELEGRAM_BOT_TOKEN is required");
  });

  it("throws when Telegram returns a non-ok response", async () => {
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "token-123");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500, text: vi.fn().mockResolvedValue("nope") }));

    await expect(sendTelegramMessage(42, "hello")).rejects.toThrow("Telegram sendMessage failed: 500 nope");
  });
});
