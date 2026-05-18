const BASE_MESSAGES: Record<string, string> = {
  evening_planning:
    "Plan tomorrow in your notebook: appointments, tasks, morning, afternoon, evening, and anything to prepare before sleep.",
  morning_check_in:
    "Open today's notebook section. Check appointments, choose the first thing for the morning, and start gently.",
  weekly_reset:
    "Weekly reset: prepare your 8-section spread for Saturday through Friday. Review upcoming appointments, unfinished tasks, Inbox, and Future Notes.",
};

export function reminderMessage(type: string, summaryLines: string[] = []): string {
  const baseMessage = BASE_MESSAGES[type] ?? "Planner reminder.";
  const lines = summaryLines.map((line) => line.trim()).filter(Boolean);

  if (lines.length === 0) {
    return baseMessage;
  }

  return `${baseMessage}\n\nSaved items:\n${lines.map((line) => `- ${line}`).join("\n")}`;
}
