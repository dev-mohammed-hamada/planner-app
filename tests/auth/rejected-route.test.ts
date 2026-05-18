import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));

import { GET } from "@/app/auth/rejected/route";

describe("rejected auth route", () => {
  it("signs out in a route handler and redirects to login", async () => {
    const signOut = vi.fn().mockResolvedValue({ error: null });
    mocks.createClient.mockResolvedValueOnce({ auth: { signOut } });

    const response = await GET(
      new Request("https://planner.example.com/auth/rejected?next=%2Fsettings"),
    );

    expect(signOut).toHaveBeenCalled();
    expect(response.headers.get("location")).toBe(
      "https://planner.example.com/auth/login?next=%2Fsettings&error=access",
    );
  });

  it("sanitizes unsafe next paths before redirecting", async () => {
    const signOut = vi.fn().mockResolvedValue({ error: null });
    mocks.createClient.mockResolvedValueOnce({ auth: { signOut } });

    const response = await GET(
      new Request(
        "https://planner.example.com/auth/rejected?next=https%3A%2F%2Fevil.example",
      ),
    );

    expect(response.headers.get("location")).toBe(
      "https://planner.example.com/auth/login?next=%2Fplanner&error=access",
    );
  });
});
