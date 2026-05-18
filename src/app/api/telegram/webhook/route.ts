import { NextRequest, NextResponse } from "next/server";

import { captureFromText } from "@/lib/planner/capture";
import { parseCapture } from "@/lib/planner/capture-parser";
import { todayInTimezone } from "@/lib/planner/dates";
import { AiParseError } from "@/lib/planner/ai-capture-parser";
import { saveParsedCapture } from "@/lib/planner/planner-repository";
import { createClient } from "@/lib/supabase/server";
import { tryCompleteLinkByCode } from "@/lib/telegram/linking";
import {
  aiFailureMessage,
  captureSavedMessage,
  linkedMessage,
  sendTelegramMessage,
  unlinkedMessage,
} from "@/lib/telegram/messages";

type TelegramUpdate = {
  message?: {
    text?: string;
    chat?: {
      id?: number;
    };
    from?: {
      id?: number;
    };
  };
};

type LinkedTelegramUser = {
  user_id: string;
};

type Profile = {
  timezone: string | null;
};

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;

  if (webhookSecret && request.headers.get("x-telegram-bot-api-secret-token") !== webhookSecret) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const update = (await request.json()) as TelegramUpdate;
  const text = update.message?.text?.trim();
  const chatId = update.message?.chat?.id;
  const telegramUserId = update.message?.from?.id;

  if (!text || chatId === undefined || telegramUserId === undefined) {
    return NextResponse.json({ ok: true });
  }

  const supabase = await createClient({ useServiceRole: true });
  const linkedUser = await findLinkedTelegramUser(supabase, telegramUserId);

  if (!linkedUser) {
    if (/^\d{6}$/.test(text)) {
      const completed = await tryCompleteLinkByCode(supabase as never, text, telegramUserId, chatId);

      if (completed) {
        await sendTelegramMessage(chatId, linkedMessage());

        return NextResponse.json({ ok: true });
      }
    }

    await sendTelegramMessage(chatId, unlinkedMessage());

    return NextResponse.json({ ok: true });
  }

  const timezone = await loadProfileTimezone(supabase, linkedUser.user_id);
  const baseDateISO = todayInTimezone(timezone);

  try {
    const outcome = await captureFromText(text, baseDateISO);
    for (const item of outcome.items) {
      await saveParsedCapture(supabase, linkedUser.user_id, item);
    }
    await sendTelegramMessage(chatId, captureSavedMessage(outcome.items.length));
  } catch (err) {
    if (!(err instanceof AiParseError)) {
      throw err;
    }
    const fallback = parseCapture(text, baseDateISO);
    await saveParsedCapture(supabase, linkedUser.user_id, fallback);
    await sendTelegramMessage(chatId, aiFailureMessage());
  }

  return NextResponse.json({ ok: true });
}

async function findLinkedTelegramUser(supabase: Awaited<ReturnType<typeof createClient>>, telegramUserId: number) {
  const { data, error } = await supabase
    .from("telegram_links")
    .select("user_id")
    .eq("link_status", "linked")
    .eq("telegram_user_id", telegramUserId)
    .maybeSingle() as { data: LinkedTelegramUser | null; error: Error | null };

  if (error) {
    throw error;
  }

  return data;
}

async function loadProfileTimezone(supabase: Awaited<ReturnType<typeof createClient>>, userId: string): Promise<string> {
  const { data, error } = await supabase
    .from("profiles")
    .select("timezone")
    .eq("id", userId)
    .maybeSingle() as { data: Profile | null; error: Error | null };

  if (error) {
    throw error;
  }

  return data?.timezone || "Asia/Gaza";
}
