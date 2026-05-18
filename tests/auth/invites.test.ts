import { describe, expect, it, vi } from "vitest";

import { isEmailInvited, normalizeEmail } from "@/lib/auth/invites";

describe("normalizeEmail", () => {
  it("trims whitespace and lowercases email addresses", () => {
    expect(normalizeEmail("  USER@Example.COM ")).toBe("user@example.com");
  });
});

describe("isEmailInvited", () => {
  it("returns true for active non-expired invites", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: { active: true, expires_at: null },
      error: null,
    });
    const eq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq }));
    const supabase = { from: vi.fn(() => ({ select })) };

    await expect(isEmailInvited(supabase as never, " USER@Example.COM ")).resolves.toBe(true);

    expect(supabase.from).toHaveBeenCalledWith("auth_invites");
    expect(eq).toHaveBeenCalledWith("email", "user@example.com");
  });

  it("returns false when no invite exists", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const eq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq }));
    const supabase = { from: vi.fn(() => ({ select })) };

    await expect(isEmailInvited(supabase as never, "nobody@example.com")).resolves.toBe(false);
  });

  it("returns false for inactive invites", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: { active: false, expires_at: null },
      error: null,
    });
    const eq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq }));
    const supabase = { from: vi.fn(() => ({ select })) };

    await expect(isEmailInvited(supabase as never, "user@example.com")).resolves.toBe(false);
  });

  it("returns false for expired invites", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: { active: true, expires_at: "2026-01-01T00:00:00.000Z" },
      error: null,
    });
    const eq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq }));
    const supabase = { from: vi.fn(() => ({ select })) };

    await expect(
      isEmailInvited(supabase as never, "user@example.com", new Date("2026-05-18T12:00:00.000Z")),
    ).resolves.toBe(false);
  });

  it("throws database errors", async () => {
    const error = new Error("database unavailable");
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error });
    const eq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq }));
    const supabase = { from: vi.fn(() => ({ select })) };

    await expect(isEmailInvited(supabase as never, "user@example.com")).rejects.toThrow(error);
  });
});
