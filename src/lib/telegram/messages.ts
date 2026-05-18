export function unlinkedMessage(): string {
  return "Send your six-digit linking code from the app to connect Telegram.";
}

export function captureSavedMessage(count: number): string {
  if (count <= 1) {
    return "Saved to your planner.";
  }
  return `Saved ${count} items to your planner.`;
}

export function aiFailureMessage(): string {
  return "AI parsing failed — saved to inbox. Open it to fix the date manually.";
}

export function linkedMessage(): string {
  return "Telegram is linked to your planner.";
}

export async function sendTelegramMessage(chatId: number, text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    throw new Error("TELEGRAM_BOT_TOKEN is required");
  }

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });

  if (!response.ok) {
    const body = await response.text();

    throw new Error(`Telegram sendMessage failed: ${response.status} ${body}`);
  }
}
