import { describe, expect, it, vi } from "vitest";

import { createPendingTelegramLink } from "@/app/(app)/settings/actions";

describe("createPendingTelegramLink", () => {
  it("returns the plain forced code and stores only its hash", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const eq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq }));
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const from = vi.fn((table: string) => {
      expect(table).toBe("telegram_links");

      return { select, upsert };
    });
    const supabase = { from };

    await expect(
      createPendingTelegramLink(supabase as never, "user-123", "123456"),
    ).resolves.toBe("123456");

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-123",
        link_status: "pending",
        code_expires_at: expect.any(String),
        telegram_chat_id: null,
        telegram_user_id: null,
        linked_at: null,
      }),
      { onConflict: "user_id" },
    );

    const storedLink = upsert.mock.calls[0]?.[0] as {
      one_time_code_hash: string;
      code_expires_at: string;
    };

    expect(storedLink.one_time_code_hash).not.toBe("123456");
    expect(storedLink.one_time_code_hash).toBe(
      "8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92",
    );
    expect(Date.parse(storedLink.code_expires_at)).toBeGreaterThan(Date.now());
  });

  it("does not replace an already linked Telegram account with a pending code", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: { link_status: "linked" },
      error: null,
    });
    const eq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq }));
    const upsert = vi.fn();
    const supabase = {
      from: vi.fn(() => ({ select, upsert })),
    };

    await expect(
      createPendingTelegramLink(supabase as never, "user-123", "123456"),
    ).rejects.toThrow("Telegram is already linked.");

    expect(upsert).not.toHaveBeenCalled();
  });
});
