export function unlinkedMessage(): string {
  return "Send your six-digit linking code from the app to connect Telegram.";
}

export function captureSavedMessage(): string {
  return "Saved to your planner.";
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
