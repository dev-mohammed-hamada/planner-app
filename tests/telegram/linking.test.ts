import { describe, expect, it, vi } from "vitest";

import { createLinkCode, hashLinkCode, tryCompleteLinkByCode } from "@/lib/telegram/linking";

describe("telegram linking", () => {
  it("creates a six digit code", () => {
    const code = createLinkCode();

    expect(code).toMatch(/^\d{6}$/);
  });

  it("hashes link codes deterministically with sha256 hex", async () => {
    await expect(hashLinkCode("123456")).resolves.toBe(
      "8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92",
    );
  });

  it("links a pending non-expired code and clears one-time fields", async () => {
    const pendingLink = { id: "link-123" };
    const maybeSingle = vi.fn().mockResolvedValue({ data: pendingLink, error: null });
    const gt = vi.fn().mockReturnValue({ maybeSingle });
    const selectEqCode = vi.fn().mockReturnValue({ gt });
    const selectEqStatus = vi.fn().mockReturnValue({ eq: selectEqCode });
    const select = vi.fn().mockReturnValue({ eq: selectEqStatus });

    const updateEq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn().mockReturnValue({ eq: updateEq });
    const from = vi.fn((table: string) => {
      expect(table).toBe("telegram_links");

      return { select, update };
    });
    const supabase = { from };

    await expect(tryCompleteLinkByCode(supabase as never, "123456", 44, 55)).resolves.toBe(true);

    expect(select).toHaveBeenCalledWith("id");
    expect(selectEqStatus).toHaveBeenCalledWith("link_status", "pending");
    expect(selectEqCode).toHaveBeenCalledWith(
      "one_time_code_hash",
      "8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92",
    );
    expect(gt).toHaveBeenCalledWith("code_expires_at", expect.any(String));
    expect(update).toHaveBeenCalledWith({
      telegram_chat_id: 55,
      telegram_user_id: 44,
      link_status: "linked",
      linked_at: expect.any(String),
      one_time_code_hash: null,
      code_expires_at: null,
    });
    expect(updateEq).toHaveBeenCalledWith("id", "link-123");
  });

  it("returns false when no pending link matches the code", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const gt = vi.fn().mockReturnValue({ maybeSingle });
    const eqCode = vi.fn().mockReturnValue({ gt });
    const eqStatus = vi.fn().mockReturnValue({ eq: eqCode });
    const select = vi.fn().mockReturnValue({ eq: eqStatus });
    const update = vi.fn();
    const supabase = {
      from: vi.fn().mockReturnValue({ select, update }),
    };

    await expect(tryCompleteLinkByCode(supabase as never, "123456", 44, 55)).resolves.toBe(false);

    expect(update).not.toHaveBeenCalled();
  });

  it("throws Supabase errors", async () => {
    const error = new Error("query failed");
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error });
    const gt = vi.fn().mockReturnValue({ maybeSingle });
    const eqCode = vi.fn().mockReturnValue({ gt });
    const eqStatus = vi.fn().mockReturnValue({ eq: eqCode });
    const select = vi.fn().mockReturnValue({ eq: eqStatus });
    const supabase = {
      from: vi.fn().mockReturnValue({ select }),
    };

    await expect(tryCompleteLinkByCode(supabase as never, "123456", 44, 55)).rejects.toThrow(error);
  });
});
