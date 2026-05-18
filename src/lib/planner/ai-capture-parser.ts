import Anthropic from "@anthropic-ai/sdk";
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

const MODEL = "claude-haiku-4-5-20251001";
const TIMEOUT_MS = 8000;

const itemSchema = z.object({
  title: z.string().min(1),
  item_type: z.enum(["task", "appointment", "note"]),
  item_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  item_time: z.string().regex(/^\d{2}:\d{2}$/).nullable(),
  block: z.enum(["morning", "afternoon", "evening", "unsorted", "none"]),
  bucket: z.enum(["weekly_spread", "inbox", "future_notes"]),
});

const toolInputSchema = z.object({
  items: z.array(itemSchema).min(1),
});

const TOOL = {
  name: "extract_planner_items",
  description: "Extract one or more planner items from a natural-language capture.",
  input_schema: {
    type: "object",
    properties: {
      items: {
        type: "array",
        minItems: 1,
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
        },
      },
    },
    required: ["items"],
  },
} as const;

type AnthropicClient = {
  messages: {
    create: (...args: unknown[]) => Promise<unknown>;
  };
};

type AiParseOptions = {
  client?: AnthropicClient;
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
    "Always call the extract_planner_items tool exactly once.",
  ].join(" ");
}

function defaultClient(): AnthropicClient {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new AiParseError("ANTHROPIC_API_KEY is not set");
  }
  return new Anthropic({ apiKey }) as unknown as AnthropicClient;
}

export async function aiParseCapture(
  text: string,
  baseDateISO: string,
  options: AiParseOptions = {},
): Promise<ParsedCapture[]> {
  let client: AnthropicClient;
  try {
    client = options.client ?? defaultClient();
  } catch (err) {
    if (err instanceof AiParseError) {
      throw err;
    }
    throw new AiParseError("Failed to construct Anthropic client", { cause: err });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  options.signal?.addEventListener("abort", () => controller.abort());

  let response: unknown;
  try {
    response = await client.messages.create(
      {
        model: MODEL,
        max_tokens: 1024,
        system: [
          {
            type: "text",
            text: buildSystemPrompt(baseDateISO),
            cache_control: { type: "ephemeral" },
          },
        ],
        tools: [{ ...TOOL, cache_control: { type: "ephemeral" } }],
        tool_choice: { type: "tool", name: TOOL.name },
        messages: [{ role: "user", content: text }],
      },
      { signal: controller.signal },
    );
  } catch (err) {
    throw new AiParseError("Anthropic API call failed", { cause: err });
  } finally {
    clearTimeout(timeout);
  }

  const toolUse = extractToolUse(response);
  if (!toolUse) {
    throw new AiParseError("Anthropic response contained no tool_use block");
  }

  const parsedInput = toolInputSchema.safeParse(toolUse);
  if (!parsedInput.success) {
    throw new AiParseError(`Tool input failed schema validation: ${parsedInput.error.message}`);
  }

  return parsedInput.data.items.map((item) => ({
    title: item.title,
    originalText: text,
    itemType: item.item_type,
    itemDate: item.item_date,
    itemTime: item.item_time,
    block: item.block,
    bucket: item.bucket,
  }));
}

function extractToolUse(response: unknown): unknown {
  if (typeof response !== "object" || response === null) return null;
  const content = (response as { content?: unknown }).content;
  if (!Array.isArray(content)) return null;
  for (const block of content) {
    if (
      typeof block === "object" &&
      block !== null &&
      (block as { type?: unknown }).type === "tool_use" &&
      (block as { name?: unknown }).name === TOOL.name
    ) {
      return (block as { input?: unknown }).input;
    }
  }
  return null;
}
