import {
  CalendarSettingsSection,
  DisplaySettingsSection,
  ReminderSettingsSection,
  type ReminderRow,
} from "@/components/settings/settings-sections";
import { TelegramLinkCard } from "@/components/settings/telegram-link-card";
import { Button } from "@/components/ui/button";
import { requireInvitedUser } from "@/lib/auth/guard";
import { getCalendarConnection } from "@/lib/calendar/connections";
import { getDisplayPreferences } from "@/lib/settings/preferences";

import { signOutAction } from "./logout-action";

export const dynamic = "force-dynamic";

type TelegramLink = {
  link_status: "pending" | "linked" | "revoked";
  code_expires_at: string | null;
};

type ReminderDefinitionRow = {
  id: string;
  reminder_type: ReminderRow["reminder_type"];
  enabled: boolean;
  local_time: string;
  day_of_week: number | null;
};

export default async function SettingsPage() {
  const { supabase, user } = await requireInvitedUser("/settings");

  const [
    { data: telegramLink },
    { data: reminderRows },
    displayPreferences,
    calendarConnection,
  ] = await Promise.all([
    supabase
      .from("telegram_links")
      .select("link_status,code_expires_at")
      .eq("user_id", user.id)
      .maybeSingle<TelegramLink>(),
    supabase
      .from("reminder_definitions")
      .select("id,reminder_type,enabled,local_time,day_of_week")
      .eq("user_id", user.id)
      .order("reminder_type"),
    getDisplayPreferences(supabase, user.id),
    getCalendarConnection(supabase, user.id),
  ]);

  const reminders: ReminderRow[] = ((reminderRows ?? []) as ReminderDefinitionRow[]).map(
    (row) => ({
      enabled: row.enabled,
      local_time: row.local_time,
      reminder_type: row.reminder_type,
    }),
  );

  return (
    <main className="min-h-screen bg-[var(--tm-surface-base)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <header className="flex flex-col gap-1">
          <p className="font-[var(--font-jetbrains-mono)] text-xs uppercase tracking-[0.18em] text-[var(--tm-text-muted)]">
            Settings
          </p>
          <h1 className="font-[var(--font-manrope)] text-3xl font-bold text-[var(--tm-text)]">
            Settings
          </h1>
        </header>

        <TelegramLinkCard
          codeExpiresAt={telegramLink?.code_expires_at ?? null}
          status={telegramLink?.link_status ?? null}
        />

        <DisplaySettingsSection preferences={displayPreferences} />
        <ReminderSettingsSection reminders={reminders} />
        <CalendarSettingsSection connection={calendarConnection} />

        <form action={signOutAction}>
          <Button type="submit" variant="destructive">
            Sign out
          </Button>
        </form>
      </div>
    </main>
  );
}
