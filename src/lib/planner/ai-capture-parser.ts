import OpenAI from "openai";
import { z } from "zod";

import type { ParsedCapture } from "@/lib/planner/types";

export class AiParseError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message);
    this.name = "AiParseError";
    if (options?.cause !== undefined) {
      (this as { cause?: unknown }).cause = options.cause;
    }
  }
}

const MODEL = "gpt-5-mini";
const TIMEOUT_MS = 15000;
const SCHEMA_NAME = "extract_planner_items";

const itemSchema = z.object({
  title: z.string().min(1),
  item_type: z.enum(["task", "appointment", "note"]),
  item_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  item_time: z.string().regex(/^\d{2}:\d{2}$/).nullable(),
  block: z.enum(["morning", "afternoon", "evening", "unsorted", "none"]),
  bucket: z.enum(["weekly_spread", "inbox", "future_notes"]),
});

const outputSchema = z.object({
  items: z.array(itemSchema).min(1),
});

const JSON_SCHEMA = {
  type: "object",
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          item_type: { type: "string", enum: ["task", "appointment", "note"] },
          item_date: { type: ["string", "null"], description: "ISO date YYYY-MM-DD or null" },
          item_time: { type: ["string", "null"], description: "HH:MM 24h or null" },
          block: { type: "string", enum: ["morning", "afternoon", "evening", "unsorted", "none"] },
          bucket: { type: "string", enum: ["weekly_spread", "inbox", "future_notes"] },
        },
        required: ["title", "item_type", "item_date", "item_time", "block", "bucket"],
        additionalProperties: false,
      },
    },
  },
  required: ["items"],
  additionalProperties: false,
} as const;

type OpenAIClient = {
  chat: {
    completions: {
      create: (...args: unknown[]) => Promise<unknown>;
    };
  };
};

type AiParseOptions = {
  client?: OpenAIClient;
  signal?: AbortSignal;
};

function buildSystemPrompt(baseDateISO: string) {
  return [
    `You extract planner items from a user's short capture message. Today's date is ${baseDateISO} (the user's local timezone).`,
    "The message can be in any language. Resolve relative date phrases (tomorrow, next friday, typos like tommorow) to a concrete ISO date when one is intended.",
    "Leave item_date and item_time null when the message has no date or time.",
    "If the message contains multiple separate plans, return them as separate items. Otherwise return one item.",
    "Use bucket weekly_spread for dated items, future_notes for vague-future intent (someday, eventually), and inbox for undated tasks. Use bucket inbox when in doubt.",
    "Use block morning, afternoon, or evening when a time of day is implied; unsorted for dated items without a clear time-of-day; none for inbox or future_notes items.",
    "Always return at least one item.",
  ].join(" ");
}

function defaultClient(): OpenAIClient {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new AiParseError("OPENAI_API_KEY is not set");
  }
  return new OpenAI({ apiKey }) as unknown as OpenAIClient;
}

export async function aiParseCapture(
  text: string,
  baseDateISO: string,
  options: AiParseOptions = {},
): Promise<ParsedCapture[]> {
  let client: OpenAIClient;
  try {
    client = options.client ?? defaultClient();
  } catch (err) {
    if (err instanceof AiParseError) {
      throw err;
    }
    throw new AiParseError("Failed to construct OpenAI client", { cause: err });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  options.signal?.addEventListener("abort", () => controller.abort());

  let response: unknown;
  try {
    response = await client.chat.completions.create(
      {
        model: MODEL,
        max_completion_tokens: 1024,
        messages: [
          { role: "system", content: buildSystemPrompt(baseDateISO) },
          { role: "user", content: text },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: SCHEMA_NAME,
            strict: true,
            schema: JSON_SCHEMA,
          },
        },
      },
      { signal: controller.signal },
    );
  } catch (err) {
    throw new AiParseError("OpenAI API call failed", { cause: err });
  } finally {
    clearTimeout(timeout);
  }

  const message = extractMessage(response);
  if (!message) {
    throw new AiParseError("OpenAI response contained no message");
  }
  if (message.refusal) {
    throw new AiParseError(`OpenAI refused the request: ${message.refusal}`);
  }
  if (!message.content) {
    throw new AiParseError("OpenAI response had no content");
  }

  let json: unknown;
  try {
    json = JSON.parse(message.content);
  } catch (err) {
    throw new AiParseError("OpenAI response content was not valid JSON", { cause: err });
  }

  const parsed = outputSchema.safeParse(json);
  if (!parsed.success) {
    throw new AiParseError(`Structured output failed schema validation: ${parsed.error.message}`);
  }

  return parsed.data.items.map((item) => ({
    title: item.title,
    originalText: text,
    itemType: item.item_type,
    itemDate: item.item_date,
    itemTime: item.item_time,
    block: item.block,
    bucket: item.bucket,
  }));
}

type Message = {
  content?: string | null;
  refusal?: string | null;
};

function extractMessage(response: unknown): Message | null {
  if (typeof response !== "object" || response === null) return null;
  const choices = (response as { choices?: unknown }).choices;
  if (!Array.isArray(choices) || choices.length === 0) return null;
  const message = (choices[0] as { message?: unknown }).message;
  if (typeof message !== "object" || message === null) return null;
  return message as Message;
}
