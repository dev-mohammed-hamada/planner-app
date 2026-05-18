# AI Capture Parser Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a hybrid AI capture parser that escalates ambiguous and multi-item Telegram messages to Anthropic Claude Haiku and returns structured planner items.

**Architecture:** Keep the existing regex `parseCapture` as the fast path. Add `aiParseCapture` (Anthropic SDK + forced tool use) and a `captureFromText` orchestrator that calls AI when regex routed to inbox or when the message heuristically looks multi-item. On AI failure, save the regex result to inbox and tell the user.

**Tech Stack:** Next.js 16 App Router, TypeScript, `@anthropic-ai/sdk`, Vitest, existing `@js-temporal/polyfill`, Supabase server client.

---

## Context And References

- Design spec: `docs/superpowers/specs/2026-05-18-ai-capture-parser-design.md`
- Existing regex parser: `src/lib/planner/capture-parser.ts`
- Existing types: `src/lib/planner/types.ts`
- Existing webhook: `src/app/api/telegram/webhook/route.ts`
- Existing repository: `src/lib/planner/planner-repository.ts`
- Existing telegram messages: `src/lib/telegram/messages.ts`
- Vitest config (no real network): `vitest.config.ts`
- `ParsedCapture` shape is fixed (see types.ts) — all new code must produce/consume that exact shape.

## File Structure

- `src/lib/planner/ai-capture-parser.ts` (new) — `aiParseCapture()`, `AiParseError`, Anthropic client construction.
- `src/lib/planner/capture.ts` (new) — `shouldEscalateToAi()`, `captureFromText()` orchestrator returning `CaptureOutcome`.
- `src/lib/telegram/messages.ts` (modify) — extend `captureSavedMessage()` with count, add `aiFailureMessage()`.
- `src/app/api/telegram/webhook/route.ts` (modify) — replace inline parse/save block with `captureFromText` call.
- `.env.example` (modify) — add `ANTHROPIC_API_KEY=`.
- `package.json` (modify) — add `@anthropic-ai/sdk` dependency.
- Tests:
  - `tests/planner/ai-capture-parser.test.ts` (new)
  - `tests/planner/capture.test.ts` (new)
  - `tests/telegram/webhook-ai.test.ts` (new)
  - `tests/telegram/messages.test.ts` (new or modify if present)

## Task 1: Install Anthropic SDK And Add Env Var

**Files:**
- Modify: `package.json` (via npm)
- Modify: `.env.example`

- [ ] **Step 1: Install the SDK**

```bash
cd /Users/mohammedhamada/Desktop/Development/Time-Manager/planner-app
npm install @anthropic-ai/sdk
```

Expected: package added; lockfile updated; no peer-dep errors.

- [ ] **Step 2: Add env var to `.env.example`**

Open `.env.example` and append a new line at the end:

```
ANTHROPIC_API_KEY=
```

Final file (for clarity):

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
TELEGRAM_BOT_TOKEN=
TELEGRAM_WEBHOOK_SECRET=
CRON_SECRET=
APP_URL=http://localhost:3000
ANTHROPIC_API_KEY=
```

- [ ] **Step 3: Verify install**

Run:

```bash
node -e "console.log(require('@anthropic-ai/sdk').default ? 'ok' : 'missing')"
```

Expected: prints `ok`.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json .env.example
git commit -m "chore: add anthropic sdk and env placeholder"
```

## Task 2: Add `aiParseCapture` With Tests

**Files:**
- Create: `src/lib/planner/ai-capture-parser.ts`
- Create: `tests/planner/ai-capture-parser.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/planner/ai-capture-parser.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";

import { AiParseError, aiParseCapture } from "@/lib/planner/ai-capture-parser";

function buildClient(response: unknown) {
  return {
    messages: {
      create: vi.fn().mockResolvedValue(response),
    },
  };
}

function toolUseResponse(items: unknown) {
  return {
    content: [
      {
        type: "tool_use",
        name: "extract_planner_items",
        input: { items },
      },
    ],
  };
}

describe("aiParseCapture", () => {
  it("returns a single ParsedCapture for one-item tool output", async () => {
    const client = buildClient(
      toolUseResponse([
        {
          title: "buy milk",
          item_type: "task",
          item_date: "2026-05-19",
          item_time: null,
          block: "unsorted",
          bucket: "weekly_spread",
        },
      ]),
    );

    const result = await aiParseCapture("buy milk tomorrow", "2026-05-18", { client: client as never });

    expect(result).toEqual([
      {
        title: "buy milk",
        originalText: "buy milk tomorrow",
        itemType: "task",
        itemDate: "2026-05-19",
        itemTime: null,
        block: "unsorted",
        bucket: "weekly_spread",
      },
    ]);
    expect(client.messages.create).toHaveBeenCalledOnce();
  });

  it("returns multiple ParsedCaptures when the tool emits multiple items", async () => {
    const client = buildClient(
      toolUseResponse([
        {
          title: "buy milk",
          item_type: "task",
          item_date: "2026-05-19",
          item_time: null,
          block: "unsorted",
          bucket: "weekly_spread",
        },
        {
          title: "call mom",
          item_type: "appointment",
          item_date: "2026-05-19",
          item_time: "16:00",
          block: "afternoon",
          bucket: "weekly_spread",
        },
      ]),
    );

    const result = await aiParseCapture("buy milk and call mom tomorrow at 4pm", "2026-05-18", {
      client: client as never,
    });

    expect(result).toHaveLength(2);
    expect(result[0].title).toBe("buy milk");
    expect(result[1].title).toBe("call mom");
    expect(result[1].itemTime).toBe("16:00");
  });

  it("throws AiParseError when the API rejects", async () => {
    const client = {
      messages: {
        create: vi.fn().mockRejectedValue(new Error("network down")),
      },
    };

    await expect(
      aiParseCapture("anything", "2026-05-18", { client: client as never }),
    ).rejects.toBeInstanceOf(AiParseError);
  });

  it("throws AiParseError when response has no tool_use block", async () => {
    const client = buildClient({ content: [{ type: "text", text: "I cannot help." }] });

    await expect(
      aiParseCapture("anything", "2026-05-18", { client: client as never }),
    ).rejects.toBeInstanceOf(AiParseError);
  });

  it("throws AiParseError when tool input has zero items", async () => {
    const client = buildClient(toolUseResponse([]));

    await expect(
      aiParseCapture("anything", "2026-05-18", { client: client as never }),
    ).rejects.toBeInstanceOf(AiParseError);
  });

  it("throws AiParseError when an item is missing required fields", async () => {
    const client = buildClient(
      toolUseResponse([
        {
          title: "buy milk",
          // missing item_type and others
        },
      ]),
    );

    await expect(
      aiParseCapture("buy milk", "2026-05-18", { client: client as never }),
    ).rejects.toBeInstanceOf(AiParseError);
  });

  it("throws AiParseError when ANTHROPIC_API_KEY is missing and no client is supplied", async () => {
    const previous = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;

    try {
      await expect(aiParseCapture("anything", "2026-05-18")).rejects.toBeInstanceOf(AiParseError);
    } finally {
      if (previous !== undefined) {
        process.env.ANTHROPIC_API_KEY = previous;
      }
    }
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run test -- tests/planner/ai-capture-parser.test.ts
```

Expected: FAIL — module `@/lib/planner/ai-capture-parser` not found.

- [ ] **Step 3: Implement the parser**

Create `src/lib/planner/ai-capture-parser.ts`:

```ts
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
```

- [ ] **Step 4: Run tests**

```bash
npm run test -- tests/planner/ai-capture-parser.test.ts
```

Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/planner/ai-capture-parser.ts tests/planner/ai-capture-parser.test.ts
git commit -m "feat: add anthropic-backed ai capture parser"
```

## Task 3: Add `captureFromText` Orchestrator With Tests

**Files:**
- Create: `src/lib/planner/capture.ts`
- Create: `tests/planner/capture.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/planner/capture.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";

import { captureFromText, shouldEscalateToAi } from "@/lib/planner/capture";
import type { ParsedCapture } from "@/lib/planner/types";

function regexInbox(text: string): ParsedCapture {
  return {
    title: text,
    originalText: text,
    itemType: "task",
    itemDate: null,
    itemTime: null,
    block: "none",
    bucket: "inbox",
  };
}

function regexDated(text: string): ParsedCapture {
  return {
    title: text,
    originalText: text,
    itemType: "task",
    itemDate: "2026-05-19",
    itemTime: null,
    block: "unsorted",
    bucket: "weekly_spread",
  };
}

describe("shouldEscalateToAi", () => {
  it("escalates when regex returns inbox", () => {
    expect(shouldEscalateToAi(regexInbox("buy milk"), "buy milk")).toBe(true);
  });

  it("does not escalate when regex returns weekly_spread with single-verb text", () => {
    expect(shouldEscalateToAi(regexDated("buy milk tomorrow"), "buy milk tomorrow")).toBe(false);
  });

  it("does not escalate when regex returns future_notes", () => {
    const future: ParsedCapture = {
      ...regexInbox("someday refactor X"),
      bucket: "future_notes",
    };
    expect(shouldEscalateToAi(future, "someday refactor X")).toBe(false);
  });

  it("escalates when text has separator and multiple verbs even if regex found a date", () => {
    expect(
      shouldEscalateToAi(regexDated("buy milk and call mom tomorrow"), "buy milk and call mom tomorrow"),
    ).toBe(true);
  });

  it("does not escalate on dated text that lacks both a separator and a second verb", () => {
    expect(shouldEscalateToAi(regexDated("workout tomorrow"), "workout tomorrow")).toBe(false);
  });
});

describe("captureFromText", () => {
  const baseDate = "2026-05-18";

  it("returns regex result without calling AI when not escalated", async () => {
    const aiParse = vi.fn();
    const outcome = await captureFromText("workout tomorrow", baseDate, { aiParse });

    expect(outcome.items).toHaveLength(1);
    expect(outcome.source).toBe("regex");
    expect(outcome.items[0].bucket).toBe("weekly_spread");
    expect(aiParse).not.toHaveBeenCalled();
  });

  it("calls AI when regex returns inbox and uses AI items", async () => {
    const aiItems: ParsedCapture[] = [
      {
        title: "buy milk",
        originalText: "tommorow buy milk",
        itemType: "task",
        itemDate: "2026-05-19",
        itemTime: null,
        block: "unsorted",
        bucket: "weekly_spread",
      },
    ];
    const aiParse = vi.fn().mockResolvedValue(aiItems);

    const outcome = await captureFromText("tommorow buy milk", baseDate, { aiParse });

    expect(outcome.source).toBe("ai");
    expect(outcome.items).toEqual(aiItems);
    expect(aiParse).toHaveBeenCalledWith("tommorow buy milk", baseDate);
  });

  it("propagates AI errors", async () => {
    const { AiParseError } = await import("@/lib/planner/ai-capture-parser");
    const aiParse = vi.fn().mockRejectedValue(new AiParseError("boom"));

    await expect(captureFromText("tommorow buy milk", baseDate, { aiParse })).rejects.toBeInstanceOf(
      AiParseError,
    );
  });

  it("calls AI when text matches multi-item heuristic even on dated regex result", async () => {
    const aiParse = vi.fn().mockResolvedValue([]);
    // Force a non-empty AI return so we can observe the call shape.
    aiParse.mockResolvedValue([
      {
        title: "buy milk",
        originalText: "buy milk and call mom tomorrow",
        itemType: "task",
        itemDate: "2026-05-19",
        itemTime: null,
        block: "unsorted",
        bucket: "weekly_spread",
      },
      {
        title: "call mom",
        originalText: "buy milk and call mom tomorrow",
        itemType: "appointment",
        itemDate: "2026-05-19",
        itemTime: null,
        block: "unsorted",
        bucket: "weekly_spread",
      },
    ]);

    const outcome = await captureFromText("buy milk and call mom tomorrow", baseDate, { aiParse });

    expect(aiParse).toHaveBeenCalledOnce();
    expect(outcome.source).toBe("ai");
    expect(outcome.items).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run test -- tests/planner/capture.test.ts
```

Expected: FAIL — module `@/lib/planner/capture` not found.

- [ ] **Step 3: Implement the orchestrator**

Create `src/lib/planner/capture.ts`:

```ts
import { parseCapture } from "@/lib/planner/capture-parser";
import { aiParseCapture as defaultAiParseCapture } from "@/lib/planner/ai-capture-parser";
import type { ParsedCapture } from "@/lib/planner/types";

const SEPARATOR_PATTERN = /(?:\s+and\s+|,|;|\s+then\s+)/i;
const ACTION_VERBS = new Set([
  "buy",
  "call",
  "send",
  "email",
  "finish",
  "write",
  "read",
  "meet",
  "see",
  "do",
  "fix",
  "review",
  "prepare",
  "plan",
  "schedule",
  "pay",
  "make",
  "book",
]);

export type CaptureOutcome = {
  items: ParsedCapture[];
  source: "regex" | "ai";
};

type CaptureOptions = {
  aiParse?: (text: string, baseDateISO: string) => Promise<ParsedCapture[]>;
};

export function shouldEscalateToAi(regexResult: ParsedCapture, text: string): boolean {
  if (regexResult.bucket === "inbox") {
    return true;
  }

  if (regexResult.bucket === "future_notes") {
    return false;
  }

  if (!SEPARATOR_PATTERN.test(text)) {
    return false;
  }

  const verbHits = text
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((token) => ACTION_VERBS.has(token));

  return verbHits.length >= 2;
}

export async function captureFromText(
  text: string,
  baseDateISO: string,
  options: CaptureOptions = {},
): Promise<CaptureOutcome> {
  const regexResult = parseCapture(text, baseDateISO);

  if (!shouldEscalateToAi(regexResult, text)) {
    return { items: [regexResult], source: "regex" };
  }

  const aiParse = options.aiParse ?? defaultAiParseCapture;
  const items = await aiParse(text, baseDateISO);

  return { items, source: "ai" };
}
```

- [ ] **Step 4: Run tests**

```bash
npm run test -- tests/planner/capture.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/planner/capture.ts tests/planner/capture.test.ts
git commit -m "feat: add captureFromText orchestrator"
```

## Task 4: Update Telegram Messages With Count And Failure Strings

**Files:**
- Modify: `src/lib/telegram/messages.ts`
- Create: `tests/telegram/messages.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/telegram/messages.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { aiFailureMessage, captureSavedMessage } from "@/lib/telegram/messages";

describe("captureSavedMessage", () => {
  it("returns singular text for one item", () => {
    expect(captureSavedMessage(1)).toBe("Saved to your planner.");
  });

  it("returns plural text with count for multiple items", () => {
    expect(captureSavedMessage(2)).toBe("Saved 2 items to your planner.");
    expect(captureSavedMessage(5)).toBe("Saved 5 items to your planner.");
  });
});

describe("aiFailureMessage", () => {
  it("returns the failure string", () => {
    expect(aiFailureMessage()).toBe(
      "AI parsing failed — saved to inbox. Open it to fix the date manually.",
    );
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run test -- tests/telegram/messages.test.ts
```

Expected: FAIL — `captureSavedMessage` signature mismatch and `aiFailureMessage` missing.

- [ ] **Step 3: Update messages module**

In `src/lib/telegram/messages.ts`, replace the existing `captureSavedMessage` and add `aiFailureMessage`:

```ts
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
```

- [ ] **Step 4: Run tests**

```bash
npm run test -- tests/telegram/messages.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/telegram/messages.ts tests/telegram/messages.test.ts
git commit -m "feat: support count and AI failure in telegram messages"
```

## Task 5: Wire Webhook To Use `captureFromText`

**Files:**
- Modify: `src/app/api/telegram/webhook/route.ts`
- Create: `tests/telegram/webhook-ai.test.ts`

- [ ] **Step 1: Write failing webhook tests**

Create `tests/telegram/webhook-ai.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/telegram/messages", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/telegram/messages")>("@/lib/telegram/messages");
  return {
    ...actual,
    sendTelegramMessage: vi.fn().mockResolvedValue(undefined),
  };
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/planner/capture", () => ({
  captureFromText: vi.fn(),
}));

vi.mock("@/lib/planner/capture-parser", () => ({
  parseCapture: vi.fn(),
}));

vi.mock("@/lib/planner/planner-repository", () => ({
  saveParsedCapture: vi.fn().mockResolvedValue(undefined),
}));

import { POST } from "@/app/api/telegram/webhook/route";
import { captureFromText } from "@/lib/planner/capture";
import { parseCapture } from "@/lib/planner/capture-parser";
import { saveParsedCapture } from "@/lib/planner/planner-repository";
import { createClient } from "@/lib/supabase/server";
import {
  aiFailureMessage,
  captureSavedMessage,
  sendTelegramMessage,
} from "@/lib/telegram/messages";
import { AiParseError } from "@/lib/planner/ai-capture-parser";

function buildSupabase(profileTimezone: string | null, linkedUserId: string | null) {
  const link = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi
      .fn()
      .mockResolvedValueOnce({
        data: linkedUserId ? { user_id: linkedUserId } : null,
        error: null,
      })
      .mockResolvedValueOnce({
        data: { timezone: profileTimezone },
        error: null,
      }),
  };
  return {
    from: vi.fn(() => link),
  };
}

function buildRequest(text: string) {
  return new Request("https://example.com/api/telegram/webhook", {
    method: "POST",
    headers: { "x-telegram-bot-api-secret-token": "ignored" },
    body: JSON.stringify({
      message: { text, chat: { id: 42 }, from: { id: 7 } },
    }),
  });
}

describe("telegram webhook AI integration", () => {
  it("saves all AI items and replies with count", async () => {
    const previousSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
    delete process.env.TELEGRAM_WEBHOOK_SECRET;

    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(
      buildSupabase("Asia/Gaza", "user-1"),
    );
    (captureFromText as ReturnType<typeof vi.fn>).mockResolvedValue({
      source: "ai",
      items: [
        {
          title: "buy milk",
          originalText: "tommorow buy milk and call mom at 4pm",
          itemType: "task",
          itemDate: "2026-05-19",
          itemTime: null,
          block: "unsorted",
          bucket: "weekly_spread",
        },
        {
          title: "call mom",
          originalText: "tommorow buy milk and call mom at 4pm",
          itemType: "appointment",
          itemDate: "2026-05-19",
          itemTime: "16:00",
          block: "afternoon",
          bucket: "weekly_spread",
        },
      ],
    });

    const response = await POST(
      buildRequest("tommorow buy milk and call mom at 4pm") as never,
    );

    expect(response.status).toBe(200);
    expect(saveParsedCapture).toHaveBeenCalledTimes(2);
    expect(sendTelegramMessage).toHaveBeenLastCalledWith(42, captureSavedMessage(2));

    if (previousSecret !== undefined) {
      process.env.TELEGRAM_WEBHOOK_SECRET = previousSecret;
    }
  });

  it("falls back to regex and replies with AI failure message when captureFromText throws", async () => {
    const previousSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
    delete process.env.TELEGRAM_WEBHOOK_SECRET;

    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(
      buildSupabase("Asia/Gaza", "user-1"),
    );
    (captureFromText as ReturnType<typeof vi.fn>).mockRejectedValue(new AiParseError("boom"));
    (parseCapture as ReturnType<typeof vi.fn>).mockReturnValue({
      title: "tommorow buy milk",
      originalText: "tommorow buy milk",
      itemType: "task",
      itemDate: null,
      itemTime: null,
      block: "none",
      bucket: "inbox",
    });

    const response = await POST(buildRequest("tommorow buy milk") as never);

    expect(response.status).toBe(200);
    expect(saveParsedCapture).toHaveBeenCalledTimes(1);
    expect(parseCapture).toHaveBeenCalledWith("tommorow buy milk", expect.any(String));
    expect(sendTelegramMessage).toHaveBeenLastCalledWith(42, aiFailureMessage());

    if (previousSecret !== undefined) {
      process.env.TELEGRAM_WEBHOOK_SECRET = previousSecret;
    }
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run test -- tests/telegram/webhook-ai.test.ts
```

Expected: FAIL — webhook still calls the old direct-parse-and-save path; mocks for `captureFromText` and `aiFailureMessage` are unused.

- [ ] **Step 3: Update the webhook**

Replace the body of `POST` in `src/app/api/telegram/webhook/route.ts`. The full updated file:

```ts
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
```

- [ ] **Step 4: Run webhook tests**

```bash
npm run test -- tests/telegram/webhook-ai.test.ts
```

Expected: PASS (2 tests).

- [ ] **Step 5: Run the full test suite**

```bash
npm run test
```

Expected: all suites pass (existing + 4 new files).

- [ ] **Step 6: Commit**

```bash
git add src/app/api/telegram/webhook/route.ts tests/telegram/webhook-ai.test.ts
git commit -m "feat: route telegram captures through ai parser"
```

## Task 6: Update CLAUDE.md And Run Full Verification

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Note the new module in CLAUDE.md**

In `CLAUDE.md`, under the "Planner model" section after the bullet list that ends with "Otherwise → `inbox`", add a single sentence and a code reference. Replace the existing paragraph

```
The AI-augmented parser (see [docs/superpowers/specs/2026-05-18-ai-capture-parser-design.md](docs/superpowers/specs/2026-05-18-ai-capture-parser-design.md)) escalates ambiguous and multi-item messages to Claude Haiku.
```

with:

```
The orchestrator [src/lib/planner/capture.ts](src/lib/planner/capture.ts) runs the regex parser first and escalates to [src/lib/planner/ai-capture-parser.ts](src/lib/planner/ai-capture-parser.ts) (Claude Haiku) when the regex result lands in inbox or the message looks multi-item. See spec [docs/superpowers/specs/2026-05-18-ai-capture-parser-design.md](docs/superpowers/specs/2026-05-18-ai-capture-parser-design.md).
```

- [ ] **Step 2: Run lint, tests, build**

```bash
npm run lint
npm run test
npm run build
```

Expected: lint clean on project sources, all tests pass, build succeeds.

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: note ai capture orchestrator in agent guide"
```

## Spec Coverage Review

- Hybrid trigger (regex first, AI on inbox OR multi-item heuristic): Task 3.
- `aiParseCapture` with Anthropic SDK, Haiku model, forced tool use, prompt caching: Task 2.
- Multi-item return + count-aware reply: Tasks 2, 4, 5.
- AI failure path saves regex result and tells the user: Tasks 4, 5.
- `ANTHROPIC_API_KEY` optional gating (missing key → AI failure path): Tasks 1, 2, 5.
- Tests with mocked Anthropic client (no real network): Tasks 2, 3, 5.
- Webhook integration tests for AI success and AI failure: Task 5.
- Documentation update: Task 6.
- Out-of-scope items (recurring tasks, priorities, schema changes, voice/photo, per-user cost limits) are not included.
