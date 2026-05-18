import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  headers: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));

vi.mock("next/headers", () => ({
  headers: mocks.headers,
}));

import {
  appOriginFromHeaders,
  sanitizeNextPath,
} from "@/lib/auth/redirects";
import {
  requestMagicLinkAction,
  requestMagicLinkForEmail,
} from "@/app/auth/login/actions";

const neutralMessage = "If this email has access, we sent a sign-in link.";

function invitedSupabase(data: { active: boolean; expires_at: string | null } | null) {
  const maybeSingle = vi.fn().mockResolvedValue({ data, error: null });
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));

  return { from: vi.fn(() => ({ select })) };
}

function formDataFor(email: string, next = "/planner") {
  const formData = new FormData();
  formData.set("email", email);
  formData.set("next", next);

  return formData;
}

describe("sanitizeNextPath", () => {
  it("keeps safe app paths", () => {
    expect(sanitizeNextPath("/settings")).toBe("/settings");
  });

  it("falls back for absolute URLs", () => {
    expect(sanitizeNextPath("https://example.com/settings")).toBe("/planner");
  });

  it("falls back for protocol-relative URLs", () => {
    expect(sanitizeNextPath("//example.com/settings")).toBe("/planner");
  });

  it("falls back for auth paths", () => {
    expect(sanitizeNextPath("/auth/login")).toBe("/planner");
  });

  it("falls back for encoded slash variants", () => {
    expect(sanitizeNextPath("/settings%2F..%2Fauth")).toBe("/planner");
  });
});

describe("appOriginFromHeaders", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses NEXT_PUBLIC_SITE_URL without a trailing slash", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://planner.example.com/");

    expect(appOriginFromHeaders("evil.example.com", "https")).toBe(
      "https://planner.example.com",
    );
  });

  it("allows localhost fallback for local development", () => {
    expect(appOriginFromHeaders("localhost:3000", "https")).toBe(
      "https://localhost:3000",
    );
  });

  it("requires NEXT_PUBLIC_SITE_URL for non-local hosts", () => {
    expect(() => appOriginFromHeaders("planner.example.com", "https")).toThrow(
      "NEXT_PUBLIC_SITE_URL is required outside local development",
    );
  });

  it("rejects malformed hosts that start with a local name", () => {
    expect(() =>
      appOriginFromHeaders("localhost:3000@evil.example", "https"),
    ).toThrow("NEXT_PUBLIC_SITE_URL is required outside local development");
  });

  it("rejects local hosts with non-numeric ports", () => {
    expect(() => appOriginFromHeaders("localhost:abc", "https")).toThrow(
      "NEXT_PUBLIC_SITE_URL is required outside local development",
    );
  });
});

describe("requestMagicLinkForEmail", () => {
  it("sends a Supabase magic link for invited emails", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: { active: true, expires_at: null },
      error: null,
    });
    const eq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq }));
    const signInWithOtp = vi.fn().mockResolvedValue({ error: null });
    const authSupabase = {
      auth: { signInWithOtp },
    };
    const inviteSupabase = {
      from: vi.fn(() => ({ select })),
    };

    await expect(
      requestMagicLinkForEmail(authSupabase as never, inviteSupabase as never, {
        email: " USER@Example.COM ",
        next: "/settings",
        origin: "https://planner.example.com",
      }),
    ).resolves.toEqual({ status: "sent" });

    expect(signInWithOtp).toHaveBeenCalledWith({
      email: "user@example.com",
      options: {
        emailRedirectTo:
          "https://planner.example.com/auth/callback?next=%2Fsettings",
      },
    });
  });

  it("does not send a Supabase magic link for uninvited emails", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const eq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq }));
    const signInWithOtp = vi.fn();
    const authSupabase = {
      auth: { signInWithOtp },
    };
    const inviteSupabase = {
      from: vi.fn(() => ({ select })),
    };

    await expect(
      requestMagicLinkForEmail(authSupabase as never, inviteSupabase as never, {
        email: "person@example.com",
        next: "/planner",
        origin: "https://planner.example.com",
      }),
    ).resolves.toEqual({ status: "not_invited" });

    expect(signInWithOtp).not.toHaveBeenCalled();
  });

  it("returns invalid_email without checking invites", async () => {
    const authSupabase = {
      auth: { signInWithOtp: vi.fn() },
    };
    const inviteSupabase = {
      from: vi.fn(),
    };

    await expect(
      requestMagicLinkForEmail(authSupabase as never, inviteSupabase as never, {
        email: "not-an-email",
        next: "/planner",
        origin: "https://planner.example.com",
      }),
    ).resolves.toEqual({ status: "invalid_email" });

    expect(inviteSupabase.from).not.toHaveBeenCalled();
  });
});

describe("requestMagicLinkAction", () => {
  beforeEach(() => {
    mocks.createClient.mockReset();
    mocks.headers.mockReset();
    mocks.headers.mockResolvedValue({
      get: (key: string) =>
        key === "host"
          ? "localhost:3000"
          : key === "x-forwarded-proto"
            ? "http"
            : null,
    });
  });

  it("returns the same neutral message for invited and uninvited emails", async () => {
    const invitedAuthSupabase = {
      auth: { signInWithOtp: vi.fn().mockResolvedValue({ error: null }) },
    };
    const uninvitedAuthSupabase = {
      auth: { signInWithOtp: vi.fn() },
    };
    mocks.createClient
      .mockResolvedValueOnce(invitedAuthSupabase)
      .mockResolvedValueOnce(
        invitedSupabase({ active: true, expires_at: null }),
      )
      .mockResolvedValueOnce(uninvitedAuthSupabase)
      .mockResolvedValueOnce(invitedSupabase(null));

    await expect(
      requestMagicLinkAction({}, formDataFor("invited@example.com")),
    ).resolves.toEqual({ message: neutralMessage });
    await expect(
      requestMagicLinkAction({}, formDataFor("uninvited@example.com")),
    ).resolves.toEqual({ message: neutralMessage });
  });

  it("returns the neutral message when Supabase cannot send an invited link", async () => {
    const authSupabase = {
      auth: {
        signInWithOtp: vi
          .fn()
          .mockResolvedValue({ error: new Error("provider unavailable") }),
      },
    };
    mocks.createClient
      .mockResolvedValueOnce(authSupabase)
      .mockResolvedValueOnce(
        invitedSupabase({ active: true, expires_at: null }),
      );

    await expect(
      requestMagicLinkAction({}, formDataFor("invited@example.com")),
    ).resolves.toEqual({ message: neutralMessage });
  });
});
