import { describe, expect, it, vi } from "vitest";

import {
  rejectedAuthPathFor,
  resolveAuthAccess,
  resolveInvitedUser,
} from "@/lib/auth/guard";

describe("resolveInvitedUser", () => {
  it("returns the user when the session and invite are valid", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: { active: true, expires_at: null },
      error: null,
    });
    const eq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq }));
    const signOut = vi.fn();
    const user = { id: "user-123", email: "USER@example.com" };
    const authSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }),
        signOut,
      },
    };
    const inviteSupabase = {
      from: vi.fn(() => ({ select })),
    };

    await expect(
      resolveInvitedUser(authSupabase as never, inviteSupabase as never),
    ).resolves.toEqual(user);
    expect(signOut).not.toHaveBeenCalled();
  });

  it("returns null when no user is signed in", async () => {
    const authSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
        signOut: vi.fn(),
      },
    };
    const inviteSupabase = {
      from: vi.fn(),
    };

    await expect(
      resolveInvitedUser(authSupabase as never, inviteSupabase as never),
    ).resolves.toBeNull();
  });

  it("returns null without signing out when the invite is invalid", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const eq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq }));
    const signOut = vi.fn().mockResolvedValue({ error: null });
    const authSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-123", email: "user@example.com" } },
          error: null,
        }),
        signOut,
      },
    };
    const inviteSupabase = {
      from: vi.fn(() => ({ select })),
    };

    await expect(
      resolveInvitedUser(authSupabase as never, inviteSupabase as never),
    ).resolves.toBeNull();
    expect(signOut).not.toHaveBeenCalled();
  });
});

describe("resolveAuthAccess", () => {
  it("returns rejected when getUser returns an error", async () => {
    const authSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: new Error("invalid session"),
        }),
        signOut: vi.fn(),
      },
    };
    const inviteSupabase = {
      from: vi.fn(),
    };

    await expect(
      resolveAuthAccess(authSupabase as never, inviteSupabase as never),
    ).resolves.toEqual({ status: "rejected" });
    expect(inviteSupabase.from).not.toHaveBeenCalled();
  });

  it("returns rejected when a user has no email", async () => {
    const authSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-123", email: null } },
          error: null,
        }),
        signOut: vi.fn(),
      },
    };
    const inviteSupabase = {
      from: vi.fn(),
    };

    await expect(
      resolveAuthAccess(authSupabase as never, inviteSupabase as never),
    ).resolves.toEqual({ status: "rejected" });
    expect(inviteSupabase.from).not.toHaveBeenCalled();
  });

  it("returns rejected when the invite check fails", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: null,
      error: new Error("database unavailable"),
    });
    const eq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq }));
    const signOut = vi.fn();
    const authSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-123", email: "user@example.com" } },
          error: null,
        }),
        signOut,
      },
    };
    const inviteSupabase = {
      from: vi.fn(() => ({ select })),
    };

    await expect(
      resolveAuthAccess(authSupabase as never, inviteSupabase as never),
    ).resolves.toEqual({ status: "rejected" });
    expect(signOut).not.toHaveBeenCalled();
  });
});

describe("rejectedAuthPathFor", () => {
  it("preserves a sanitized next path", () => {
    expect(rejectedAuthPathFor("/settings")).toBe(
      "/auth/rejected?next=%2Fsettings",
    );
  });

  it("falls back for unsafe next paths", () => {
    expect(rejectedAuthPathFor("https://evil.example")).toBe(
      "/auth/rejected?next=%2Fplanner",
    );
  });
});
