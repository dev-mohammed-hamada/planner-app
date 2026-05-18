"use server";

import { createLinkCode, hashLinkCode } from "@/lib/telegram/linking";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

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
