import { Temporal } from "@js-temporal/polyfill";
import { NextRequest, NextResponse } from "next/server";

import { isReminderDue, reminderSlotISO } from "@/lib/reminders/due-reminders";
import { reminderMessage } from "@/lib/reminders/reminder-messages";
import { createClient } from "@/lib/supabase/server";
import { sendTelegramMessage } from "@/lib/telegram/messages";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

type ReminderDefinition = {
  id: string;
  user_id: string;
  reminder_type: string;
  local_time: string;
  day_of_week: number | null;
};

type Profile = {
  timezone: string | null;
};

type TelegramLink = {
  telegram_chat_id: number | null;
};

type DeliveryLog = {
  id: string;
};

type PlannerItem = {
  title: string;
  item_date: string | null;
  item_time: string | null;
  bucket: string;
};

const DEFAULT_TIMEZONE = "Asia/Gaza";
const SUMMARY_LINE_LIMIT = 12;

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const supabase = await createClient({ useServiceRole: true });
  const nowISO = Temporal.Now.instant().toString();
  const scheduledFor = reminderSlotISO(nowISO);
  const reminders = await loadEnabledReminders(supabase);
  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const reminder of reminders) {
    const timezone = await loadProfileTimezone(supabase, reminder.user_id);

    if (!isReminderDue({
      reminderType: reminder.reminder_type,
      localTime: reminder.local_time,
      dayOfWeek: reminder.day_of_week,
      timezone,
      nowISO,
    })) {
      skipped += 1;
      continue;
    }

    if (await deliveryLogExists(supabase, reminder.id, scheduledFor)) {
      skipped += 1;
      continue;
    }

    const chatId = await loadLinkedTelegramChatId(supabase, reminder.user_id);

    if (chatId === null) {
      skipped += 1;
      continue;
    }

    try {
      const summaryLines = await loadSummaryLines(supabase, reminder.user_id, reminder.reminder_type, timezone, nowISO);

      await sendTelegramMessage(chatId, reminderMessage(reminder.reminder_type, summaryLines));
      await insertDeliveryLog(supabase, {
        reminderDefinitionId: reminder.id,
        userId: reminder.user_id,
        scheduledFor,
        status: "sent",
        sentAt: Temporal.Now.instant().toString(),
      });
      sent += 1;
    } catch (error) {
      await insertDeliveryLog(supabase, {
        reminderDefinitionId: reminder.id,
        userId: reminder.user_id,
        scheduledFor,
        status: "failed",
        failureReason: error instanceof Error ? error.message : "Unknown reminder send error",
      });
      failed += 1;
    }
  }

  return NextResponse.json({ ok: true, sent, failed, skipped });
}

async function loadEnabledReminders(supabase: SupabaseClient): Promise<ReminderDefinition[]> {
  const { data, error } = await supabase
    .from("reminder_definitions")
    .select("id,user_id,reminder_type,local_time,day_of_week")
    .eq("enabled", true) as { data: ReminderDefinition[] | null; error: Error | null };

  if (error) {
    throw error;
  }

  return data ?? [];
}

async function loadProfileTimezone(supabase: SupabaseClient, userId: string): Promise<string> {
  const { data, error } = await supabase
    .from("profiles")
    .select("timezone")
    .eq("id", userId)
    .maybeSingle() as { data: Profile | null; error: Error | null };

  if (error) {
    throw error;
  }

  return data?.timezone || DEFAULT_TIMEZONE;
}

async function deliveryLogExists(supabase: SupabaseClient, reminderDefinitionId: string, scheduledFor: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("reminder_delivery_logs")
    .select("id")
    .eq("reminder_definition_id", reminderDefinitionId)
    .eq("scheduled_for", scheduledFor)
    .maybeSingle() as { data: DeliveryLog | null; error: Error | null };

  if (error) {
    throw error;
  }

  return data !== null;
}

async function loadLinkedTelegramChatId(supabase: SupabaseClient, userId: string): Promise<number | null> {
  const { data, error } = await supabase
    .from("telegram_links")
    .select("telegram_chat_id")
    .eq("user_id", userId)
    .eq("link_status", "linked")
    .maybeSingle() as { data: TelegramLink | null; error: Error | null };

  if (error) {
    throw error;
  }

  return data?.telegram_chat_id ?? null;
}

async function loadSummaryLines(
  supabase: SupabaseClient,
  userId: string,
  reminderType: string,
  timezone: string,
  nowISO: string,
): Promise<string[]> {
  const today = Temporal.Instant.from(nowISO).toZonedDateTimeISO(timezone).toPlainDate();

  if (reminderType === "evening_planning") {
    return loadDatedPlannerLines(supabase, userId, today.add({ days: 1 }).toString());
  }

  if (reminderType === "morning_check_in") {
    return loadDatedPlannerLines(supabase, userId, today.toString());
  }

  if (reminderType === "weekly_reset") {
    return loadWeeklyResetLines(supabase, userId, today);
  }

  return [];
}

async function loadDatedPlannerLines(supabase: SupabaseClient, userId: string, date: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("planner_items")
    .select("title,item_date,item_time,bucket")
    .eq("user_id", userId)
    .eq("status", "active")
    .eq("item_date", date)
    .order("item_time", { ascending: true, nullsFirst: false })
    .limit(SUMMARY_LINE_LIMIT) as { data: PlannerItem[] | null; error: Error | null };

  if (error) {
    throw error;
  }

  return (data ?? []).map(formatPlannerLine);
}

async function loadWeeklyResetLines(supabase: SupabaseClient, userId: string, today: Temporal.PlainDate): Promise<string[]> {
  const daysUntilSaturday = (6 - jsDayOfWeek(today.dayOfWeek) + 7) % 7;
  const weekStart = today.add({ days: daysUntilSaturday });
  const weekEnd = weekStart.add({ days: 6 });
  const datedLines = await loadDatedRangePlannerLines(supabase, userId, weekStart.toString(), weekEnd.toString());
  const noteLines = await loadInboxAndFutureNoteLines(supabase, userId, SUMMARY_LINE_LIMIT - datedLines.length);

  return [...datedLines, ...noteLines].slice(0, SUMMARY_LINE_LIMIT);
}

async function loadDatedRangePlannerLines(
  supabase: SupabaseClient,
  userId: string,
  startDate: string,
  endDate: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from("planner_items")
    .select("title,item_date,item_time,bucket")
    .eq("user_id", userId)
    .eq("status", "active")
    .gte("item_date", startDate)
    .lte("item_date", endDate)
    .order("item_date", { ascending: true })
    .order("item_time", { ascending: true, nullsFirst: false })
    .limit(SUMMARY_LINE_LIMIT) as { data: PlannerItem[] | null; error: Error | null };

  if (error) {
    throw error;
  }

  return (data ?? []).map(formatPlannerLine);
}

async function loadInboxAndFutureNoteLines(supabase: SupabaseClient, userId: string, limit: number): Promise<string[]> {
  if (limit <= 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("planner_items")
    .select("title,item_date,item_time,bucket")
    .eq("user_id", userId)
    .eq("status", "active")
    .in("bucket", ["inbox", "future_notes"])
    .order("created_at", { ascending: true })
    .limit(limit) as { data: PlannerItem[] | null; error: Error | null };

  if (error) {
    throw error;
  }

  return (data ?? []).map((item) => `${item.bucket === "future_notes" ? "Future" : "Inbox"}: ${item.title}`);
}

async function insertDeliveryLog(
  supabase: SupabaseClient,
  input: {
    reminderDefinitionId: string;
    userId: string;
    scheduledFor: string;
    status: "sent" | "failed";
    sentAt?: string;
    failureReason?: string;
  },
) {
  const { error } = await supabase.from("reminder_delivery_logs").insert({
    reminder_definition_id: input.reminderDefinitionId,
    user_id: input.userId,
    scheduled_for: input.scheduledFor,
    status: input.status,
    sent_at: input.sentAt ?? null,
    failure_reason: input.failureReason ?? null,
  });

  if (error) {
    throw error;
  }
}

function formatPlannerLine(item: PlannerItem): string {
  const date = item.item_date ? `${item.item_date} ` : "";
  const time = item.item_time ? `${item.item_time.slice(0, 5)} ` : "";

  return `${date}${time}${item.title}`.trim();
}

function jsDayOfWeek(temporalDayOfWeek: number): number {
  return temporalDayOfWeek === 7 ? 0 : temporalDayOfWeek;
}
