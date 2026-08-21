"use server";

import { revalidatePath } from "next/cache";

import {
  updateCalendarConnection,
  type CalendarConnection,
} from "@/lib/calendar/connections";
import {
  updateDisplayPreferences,
  updateReminderDefinition,
  type DisplayPreferences,
} from "@/lib/settings/preferences";
import { createLinkCode, hashLinkCode } from "@/lib/telegram/linking";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

function formValue(formData: FormData, key: string): string | undefined {
  const raw = formData.get(key);
  return typeof raw === "string" ? raw : undefined;
}

export type TelegramLinkActionState = {
  code?: string;
  error?: string;
};

type TelegramLinkStatus = {
  link_status: "pending" | "linked" | "revoked";
};

class TelegramLinkAlreadyLinkedError extends Error {
  constructor() {
    super("Telegram is already linked.");
  }
}

export async function createPendingTelegramLink(
  supabase: SupabaseClient,
  userId: string,
  forcedCode?: string,
): Promise<string> {
  const { data: existingLink, error: readError } = await supabase
    .from("telegram_links")
    .select("link_status")
    .eq("user_id", userId)
    .maybeSingle<TelegramLinkStatus>();

  if (readError) {
    throw readError;
  }

  if (existingLink?.link_status === "linked") {
    throw new TelegramLinkAlreadyLinkedError();
  }

  const code = forcedCode ?? createLinkCode();
  const codeHash = await hashLinkCode(code);
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  const { error } = await supabase.from("telegram_links").upsert(
    {
      user_id: userId,
      link_status: "pending",
      one_time_code_hash: codeHash,
      code_expires_at: expiresAt,
      telegram_chat_id: null,
      telegram_user_id: null,
      linked_at: null,
    },
    { onConflict: "user_id" },
  );

  if (error) {
    throw error;
  }

  return code;
}

export async function requestTelegramLinkCode(
  previousState: TelegramLinkActionState,
  formData: FormData,
): Promise<TelegramLinkActionState> {
  void previousState;
  void formData;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Sign in to create a Telegram link code." };
  }

  try {
    const code = await createPendingTelegramLink(supabase, user.id);

    return { code };
  } catch (error) {
    if (error instanceof TelegramLinkAlreadyLinkedError) {
      return { error: error.message };
    }

    console.error("Could not create Telegram link code", error);

    return {
      error: "Could not create a link code.",
    };
  }
}

async function requireUserId(): Promise<{ supabase: SupabaseClient; userId: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not signed in");
  }

  return { supabase, userId: user.id };
}

export async function updateDisplayPreferencesAction(
  formData: FormData,
): Promise<void> {
  const { supabase, userId } = await requireUserId();

  const patch: Partial<DisplayPreferences> = {};

  const theme = formValue(formData, "theme");
  if (theme === "light" || theme === "dark" || theme === "system") {
    patch.theme = theme;
  }

  const bucket = formValue(formData, "quick_add_default_bucket");
  if (
    bucket === "weekly_spread" ||
    bucket === "inbox" ||
    bucket === "future_notes"
  ) {
    patch.quick_add_default_bucket = bucket;
  }

  if (Object.keys(patch).length === 0) {
    return;
  }

  await updateDisplayPreferences(supabase, userId, patch);
  revalidatePath("/settings");
}

export async function updateReminderDefinitionAction(
  formData: FormData,
): Promise<void> {
  const { supabase, userId } = await requireUserId();

  const reminderType = formValue(formData, "reminder_type");
  if (
    reminderType !== "evening_planning" &&
    reminderType !== "morning_check_in" &&
    reminderType !== "weekly_reset"
  ) {
    throw new Error("Unknown reminder type");
  }

  const enabledRaw = formValue(formData, "enabled");
  const patch: { enabled?: boolean; local_time?: string } = {
    enabled: enabledRaw === "on" || enabledRaw === "true",
  };

  const localTime = formValue(formData, "local_time");
  if (localTime && localTime.length > 0) {
    patch.local_time = localTime;
  }

  await updateReminderDefinition(supabase, userId, reminderType, patch);
  revalidatePath("/settings");
}

export async function updateCalendarConnectionAction(
  formData: FormData,
): Promise<void> {
  const { supabase, userId } = await requireUserId();

  const status = formValue(formData, "status");
  if (
    status !== "not_connected" &&
    status !== "connected" &&
    status !== "error" &&
    status !== "revoked"
  ) {
    throw new Error("Unknown calendar status");
  }

  const emailRaw = formValue(formData, "provider_account_email");
  const provider_account_email =
    emailRaw && emailRaw.trim().length > 0 ? emailRaw.trim() : null;

  const patch: Omit<Partial<CalendarConnection>, "provider" | "last_synced_at"> & {
    status: CalendarConnection["status"];
  } = {
    status,
    provider_account_email,
  };

  await updateCalendarConnection(supabase, userId, patch);
  revalidatePath("/settings");
}
