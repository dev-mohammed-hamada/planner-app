import { TelegramLinkCard } from "@/components/settings/telegram-link-card";
import { requireInvitedUser } from "@/lib/auth/guard";

export const dynamic = "force-dynamic";

type TelegramLink = {
  link_status: "pending" | "linked" | "revoked";
  code_expires_at: string | null;
};

const defaultReminders = [
  {
    label: "Evening planning",
    schedule: "10:00 PM",
  },
  {
    label: "Morning check-in",
    schedule: "9:00 AM",
  },
  {
    label: "Weekly reset",
    schedule: "Friday 10:15 PM",
  },
];

export default async function SettingsPage() {
  const { supabase, user } = await requireInvitedUser("/settings");

  const { data: telegramLink } = await supabase
    .from("telegram_links")
    .select("link_status,code_expires_at")
    .eq("user_id", user.id)
    .maybeSingle<TelegramLink>();

  return (
    <main className="planner-paper min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-4xl flex-col gap-5">
        <header className="flex flex-col gap-1">
          <p className="planner-accent text-sm font-semibold">Settings</p>
          <h1 className="planner-ink text-2xl font-semibold tracking-normal">
            Planner preferences
          </h1>
        </header>

        <TelegramLinkCard
          codeExpiresAt={telegramLink?.code_expires_at ?? null}
          status={telegramLink?.link_status ?? null}
        />

        <section className="planner-paper-sheet planner-rule rounded-lg border shadow-sm shadow-stone-200/60">
          <header className="planner-divider border-b px-4 py-3">
            <h2 className="planner-ink text-base font-semibold">Reminders</h2>
          </header>
          <ul className="divide-y planner-divider">
            {defaultReminders.map((reminder) => (
              <li
                className="flex items-center justify-between gap-4 px-4 py-3"
                key={reminder.label}
              >
                <span className="planner-ink text-sm font-medium">
                  {reminder.label}
                </span>
                <span className="planner-ink-muted text-sm">
                  {reminder.schedule}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
