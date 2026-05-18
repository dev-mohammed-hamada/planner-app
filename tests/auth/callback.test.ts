import { describe, expect, it, vi } from "vitest";

import { handleAuthCallback } from "@/app/auth/callback/route";

function inviteSupabase(
  result:
    | { data: { active: boolean; expires_at: string | null } | null; error: Error | null }
    | Promise<{ data: { active: boolean; expires_at: string | null } | null; error: Error | null }>,
) {
  const maybeSingle = vi.fn().mockResolvedValue(result);
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));

  return { from: vi.fn(() => ({ select })) };
}

describe("handleAuthCallback", () => {
  it("exchanges the auth code and redirects to a safe next path", async () => {
    const exchangeCodeForSession = vi.fn().mockResolvedValue({ error: null });
    const getUser = vi.fn().mockResolvedValue({
      data: { user: { email: "user@example.com" } },
      error: null,
    });
    const signOut = vi.fn();
    const authSupabase = {
      auth: { exchangeCodeForSession, getUser, signOut },
    };

    const redirectUrl = await handleAuthCallback(
      authSupabase as never,
      inviteSupabase({
        data: { active: true, expires_at: null },
        error: null,
      }) as never,
      new URL("https://planner.example.com/auth/callback?code=abc&next=%2Fsettings"),
    );

    expect(exchangeCodeForSession).toHaveBeenCalledWith("abc");
    expect(redirectUrl).toBe("https://planner.example.com/settings");
    expect(signOut).not.toHaveBeenCalled();
  });

  it("redirects to login when code exchange fails", async () => {
    const authSupabase = {
      auth: {
        exchangeCodeForSession: vi.fn().mockResolvedValue({ error: new Error("bad code") }),
        getUser: vi.fn(),
        signOut: vi.fn(),
      },
    };
    const redirectUrl = await handleAuthCallback(
      authSupabase as never,
      { from: vi.fn() } as never,
      new URL("https://planner.example.com/auth/callback?code=abc&next=%2Fsettings"),
    );

    expect(redirectUrl).toBe("https://planner.example.com/auth/login?error=callback");
  });

  it("redirects to login when the code is missing", async () => {
    const authSupabase = {
      auth: {
        exchangeCodeForSession: vi.fn(),
        getUser: vi.fn(),
        signOut: vi.fn(),
      },
    };
    const inviteClient = { from: vi.fn() };

    const redirectUrl = await handleAuthCallback(
      authSupabase as never,
      inviteClient as never,
      new URL("https://planner.example.com/auth/callback?next=%2Fsettings"),
    );

    expect(redirectUrl).toBe("https://planner.example.com/auth/login?error=callback");
    expect(authSupabase.auth.exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it("sanitizes unsafe next paths", async () => {
    const authSupabase = {
      auth: {
        exchangeCodeForSession: vi.fn().mockResolvedValue({ error: null }),
        getUser: vi.fn().mockResolvedValue({
          data: { user: { email: "user@example.com" } },
          error: null,
        }),
        signOut: vi.fn(),
      },
    };

    const redirectUrl = await handleAuthCallback(
      authSupabase as never,
      inviteSupabase({
        data: { active: true, expires_at: null },
        error: null,
      }) as never,
      new URL("https://planner.example.com/auth/callback?code=abc&next=https%3A%2F%2Fevil.example"),
    );

    expect(redirectUrl).toBe("https://planner.example.com/planner");
  });

  it("signs out and redirects to login when the invite is inactive", async () => {
    const signOut = vi.fn().mockResolvedValue({ error: null });
    const authSupabase = {
      auth: {
        exchangeCodeForSession: vi.fn().mockResolvedValue({ error: null }),
        getUser: vi.fn().mockResolvedValue({
          data: { user: { email: "user@example.com" } },
          error: null,
        }),
        signOut,
      },
    };

    const redirectUrl = await handleAuthCallback(
      authSupabase as never,
      inviteSupabase({
        data: { active: false, expires_at: null },
        error: null,
      }) as never,
      new URL("https://planner.example.com/auth/callback?code=abc&next=%2Fsettings"),
    );

    expect(signOut).toHaveBeenCalled();
    expect(redirectUrl).toBe("https://planner.example.com/auth/login?error=access");
  });

  it("signs out and redirects to login when the user has no email", async () => {
    const signOut = vi.fn().mockResolvedValue({ error: null });
    const authSupabase = {
      auth: {
        exchangeCodeForSession: vi.fn().mockResolvedValue({ error: null }),
        getUser: vi.fn().mockResolvedValue({
          data: { user: { email: null } },
          error: null,
        }),
        signOut,
      },
    };
    const inviteClient = { from: vi.fn() };

    const redirectUrl = await handleAuthCallback(
      authSupabase as never,
      inviteClient as never,
      new URL("https://planner.example.com/auth/callback?code=abc&next=%2Fsettings"),
    );

    expect(signOut).toHaveBeenCalled();
    expect(inviteClient.from).not.toHaveBeenCalled();
    expect(redirectUrl).toBe("https://planner.example.com/auth/login?error=access");
  });

  it("signs out and redirects to login when invite validation fails", async () => {
    const signOut = vi.fn().mockResolvedValue({ error: null });
    const authSupabase = {
      auth: {
        exchangeCodeForSession: vi.fn().mockResolvedValue({ error: null }),
        getUser: vi.fn().mockResolvedValue({
          data: { user: { email: "user@example.com" } },
          error: null,
        }),
        signOut,
      },
    };

    const redirectUrl = await handleAuthCallback(
      authSupabase as never,
      inviteSupabase({ data: null, error: new Error("database unavailable") }) as never,
      new URL("https://planner.example.com/auth/callback?code=abc&next=%2Fsettings"),
    );

    expect(signOut).toHaveBeenCalled();
    expect(redirectUrl).toBe("https://planner.example.com/auth/login?error=access");
  });
});
