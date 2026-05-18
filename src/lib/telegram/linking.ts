import { createHash, randomInt } from "node:crypto";

type SupabaseLike = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: unknown) => unknown;
    };
    update: (values: Record<string, unknown>) => {
      eq: (column: string, value: unknown) => Promise<{ error: unknown | null }>;
    };
  };
};

type PendingLink = {
  id: string;
};

export function createLinkCode(): string {
  return randomInt(100000, 1000000).toString();
}

export async function hashLinkCode(code: string): Promise<string> {
  return createHash("sha256").update(code).digest("hex");
}

export async function tryCompleteLinkByCode(
  supabase: SupabaseLike,
  code: string,
  telegramUserId: number,
  telegramChatId: number,
): Promise<boolean> {
  const codeHash = await hashLinkCode(code);
  const now = new Date().toISOString();
  const query = supabase
    .from("telegram_links")
    .select("id")
    .eq("link_status", "pending") as {
    eq: (column: string, value: unknown) => {
      gt: (column: string, value: unknown) => {
        maybeSingle: () => Promise<{ data: PendingLink | null; error: unknown | null }>;
      };
    };
  };

  const { data, error } = await query.eq("one_time_code_hash", codeHash).gt("code_expires_at", now).maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return false;
  }

  const { error: updateError } = await supabase.from("telegram_links").update({
    telegram_chat_id: telegramChatId,
    telegram_user_id: telegramUserId,
    link_status: "linked",
    linked_at: now,
    one_time_code_hash: null,
    code_expires_at: null,
  }).eq("id", data.id);

  if (updateError) {
    throw updateError;
  }

  return true;
}
