import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

const connectionPatchSchema = z.object({
  provider_account_email: z.string().email().nullable().optional(),
  status: z.enum(["not_connected", "connected", "error", "revoked"]),
});

export type CalendarConnection = {
  provider: "google";
  status: "not_connected" | "connected" | "error" | "revoked";
  provider_account_email: string | null;
  last_synced_at: string | null;
};

export const defaultCalendarConnection: CalendarConnection = {
  provider: "google",
  status: "not_connected",
  provider_account_email: null,
  last_synced_at: null,
};

export async function getCalendarConnection(
  supabase: SupabaseClient,
  userId: string,
): Promise<CalendarConnection> {
  const { data, error } = await supabase
    .from("calendar_connections")
    .select("provider,status,provider_account_email,last_synced_at")
    .eq("user_id", userId)
    .eq("provider", "google")
    .maybeSingle<CalendarConnection>();

  if (error) {
    throw error;
  }

  return data ?? defaultCalendarConnection;
}

export async function updateCalendarConnection(
  supabase: SupabaseClient,
  userId: string,
  patch: Omit<Partial<CalendarConnection>, "provider" | "last_synced_at"> & {
    status: CalendarConnection["status"];
  },
) {
  const parsed = connectionPatchSchema.parse(patch);
  const { error } = await supabase
    .from("calendar_connections")
    .upsert(
      {
        user_id: userId,
        provider: "google",
        ...parsed,
      },
      { onConflict: "user_id,provider" },
    );

  if (error) {
    throw error;
  }
}
