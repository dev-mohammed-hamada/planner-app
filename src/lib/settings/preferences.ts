import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

const displaySchema = z.object({
  theme: z.enum(["light", "dark", "system"]).optional(),
  default_calendar_view: z.literal("day").optional(),
  quick_add_default_bucket: z.enum(["weekly_spread", "inbox", "future_notes"]).optional(),
});

export type DisplayPreferences = {
  theme: "light" | "dark" | "system";
  default_calendar_view: "day";
  quick_add_default_bucket: "weekly_spread" | "inbox" | "future_notes";
};

export const defaultDisplayPreferences: DisplayPreferences = {
  theme: "system",
  default_calendar_view: "day",
  quick_add_default_bucket: "weekly_spread",
};

export async function getDisplayPreferences(
  supabase: SupabaseClient,
  userId: string,
): Promise<DisplayPreferences> {
  const { data, error } = await supabase
    .from("user_preferences")
    .select("theme,default_calendar_view,quick_add_default_bucket")
    .eq("user_id", userId)
    .maybeSingle<Partial<DisplayPreferences>>();

  if (error) {
    throw error;
  }

  return {
    ...defaultDisplayPreferences,
    ...data,
  };
}

export async function updateDisplayPreferences(
  supabase: SupabaseClient,
  userId: string,
  patch: Partial<DisplayPreferences>,
) {
  const parsed = displaySchema.parse(patch);
  const { error } = await supabase
    .from("user_preferences")
    .upsert({ user_id: userId, ...parsed }, { onConflict: "user_id" });

  if (error) {
    throw error;
  }
}

export async function updateReminderDefinition(
  supabase: SupabaseClient,
  userId: string,
  reminderType: "evening_planning" | "morning_check_in" | "weekly_reset",
  patch: { enabled?: boolean; local_time?: string; day_of_week?: number | null },
) {
  const { error } = await supabase
    .from("reminder_definitions")
    .update(patch)
    .eq("user_id", userId)
    .eq("reminder_type", reminderType);

  if (error) {
    throw error;
  }
}
