import { describe, expect, it, vi } from "vitest";

import { getCalendarConnection, updateCalendarConnection } from "@/lib/calendar/connections";

describe("calendar connections", () => {
  it("returns not connected state when no row exists", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const eqProvider = vi.fn().mockReturnValue({ maybeSingle });
    const eqUser = vi.fn().mockReturnValue({ eq: eqProvider });
    const select = vi.fn().mockReturnValue({ eq: eqUser });
    const from = vi.fn().mockReturnValue({ select });

    const result = await getCalendarConnection({ from } as never, "user-123");

    expect(result).toEqual({
      provider: "google",
      provider_account_email: null,
      status: "not_connected",
      last_synced_at: null,
    });
  });

  it("upserts calendar connection state", async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const from = vi.fn().mockReturnValue({ upsert });

    await updateCalendarConnection({ from } as never, "user-123", {
      provider_account_email: "user@example.com",
      status: "connected",
    });

    expect(upsert).toHaveBeenCalledWith(
      {
        provider: "google",
        provider_account_email: "user@example.com",
        status: "connected",
        user_id: "user-123",
      },
      { onConflict: "user_id,provider" },
    );
  });
});
