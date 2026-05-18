# AI Capture Parser Design

**Date:** 2026-05-18
**Status:** Approved, ready for implementation plan

## Goal

Replace brittle regex-only capture parsing with a hybrid pipeline that escalates ambiguous or multi-item Telegram messages to an Anthropic Claude model, returning one or more structured planner items per message.

## Motivation

The current regex parser at `src/lib/planner/capture-parser.ts` only routes messages to the weekly spread when they contain literal `today`, `tomorrow`, or a weekday name. Common inputs like `"Tommorow i have a to see mohammed on 4 pm"` (typo) silently land in the inbox with no date, defeating the planner's primary purpose. Users in any language and with any phrasing should be able to capture a plan that lands on the right day and time.

## Non-Goals

- Recurring tasks, priorities, or any new fields in `planner_items`
- Voice, photo, or OCR capture paths
- AI-driven actions beyond extraction (no reschedule, complete, delete via chat)
- Per-user cost guardrails (single-user app for now)
- Replacing the regex parser entirely; the regex layer remains the fast path

## Architecture

```
Telegram update → webhook → captureFromText(text, baseDateISO)
                              │
                              ├─ parseCapture() (regex, sync)
                              │
                              ├─ should AI run?
                              │     - regex returned bucket = "inbox"  → yes
                              │     - text matches multi-item heuristic → yes
                              │
                              ├─ yes → aiParseCapture(text, baseDateISO) → ParsedCapture[]
                              │     - on error → throw AiParseError
                              │
                              └─ no  → [regex result]   (single item)
```

The webhook persists each `ParsedCapture` via the existing `saveParsedCapture()` and confirms with a count-aware message. On AI failure, the webhook saves the regex result to the inbox and tells the user.

## Components

### 1. `src/lib/planner/ai-capture-parser.ts` (new)

```ts
export class AiParseError extends Error {}

export async function aiParseCapture(
  text: string,
  baseDateISO: string,
  options?: { client?: AnthropicClient; signal?: AbortSignal },
): Promise<ParsedCapture[]>
```

- Uses `@anthropic-ai/sdk`, model `claude-haiku-4-5-20251001`.
- Forces a single tool call (`extract_planner_items`) with `tool_choice: { type: "tool", name: "extract_planner_items" }`.
- System prompt + tool spec marked with `cache_control: { type: "ephemeral" }` for prompt caching.
- 8 s timeout via `AbortSignal`. On timeout, network error, non-tool response, or schema validation failure → throws `AiParseError`.
- Reads `ANTHROPIC_API_KEY` from env. If absent at module init, function throws `AiParseError` immediately so callers can short-circuit.

#### Tool schema

```json
{
  "name": "extract_planner_items",
  "description": "Extract one or more planner items from a natural-language capture.",
  "input_schema": {
    "type": "object",
    "properties": {
      "items": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "title": { "type": "string" },
            "item_type": { "enum": ["task", "appointment", "note"] },
            "item_date": { "type": ["string", "null"], "description": "ISO date YYYY-MM-DD or null" },
            "item_time": { "type": ["string", "null"], "description": "HH:MM 24h or null" },
            "block": { "enum": ["morning", "afternoon", "evening", "unsorted", "none"] },
            "bucket": { "enum": ["weekly_spread", "inbox", "future_notes"] }
          },
          "required": ["title", "item_type", "item_date", "item_time", "block", "bucket"]
        },
        "minItems": 1
      }
    },
    "required": ["items"]
  }
}
```

#### System prompt (sketch)

> You extract planner items from a user's short capture message. Today's date is `{baseDateISO}` (the user's local timezone). The message can be in any language. Resolve relative date phrases ("tomorrow", "next friday", typos like "tommorow") to a concrete ISO date when one is intended. Leave `item_date`/`item_time` as `null` when the message has no date. If the message contains multiple separate plans, return them as separate items. Otherwise return one item. Use bucket `weekly_spread` for dated items, `future_notes` for vague-future intent ("someday", "eventually"), and `inbox` for undated tasks. Use bucket `inbox` when in doubt.

Caller maps each returned item into the existing `ParsedCapture` shape, attaching `originalText: text`.

### 2. `captureFromText(text, baseDateISO)` helper (new, in webhook file or `src/lib/planner/capture.ts`)

Encapsulates the decision logic so the webhook stays thin and is testable:

```ts
export type CaptureOutcome =
  | { items: ParsedCapture[]; source: "regex" | "ai" }
  | { items: ParsedCapture[]; source: "ai_failed_regex_fallback" };

export async function captureFromText(text: string, baseDateISO: string): Promise<CaptureOutcome>
```

#### Trigger predicate

`shouldEscalateToAi(regexResult, text)` returns true when **either**:

- `regexResult.bucket === "inbox"`, OR
- `text` matches the multi-item heuristic: contains a separator (` and `, `,`, `;`, ` then `) **AND** at least two verb-like leading tokens (a tiny word-list match against a static set: `buy, call, send, email, finish, write, read, meet, see, do, fix, review, prepare, plan, schedule`).

The heuristic is intentionally conservative: false-negatives are fine (regex result still saves), false-positives only cost one AI call.

### 3. Webhook changes (`src/app/api/telegram/webhook/route.ts`)

Replace the existing inline `parseCapture` + `saveParsedCapture` block with:

```ts
let outcome: CaptureOutcome;
try {
  outcome = await captureFromText(text, todayInTimezone(timezone));
} catch (err) {
  // AI threw — save regex result, tell user
  const regexResult = parseCapture(text, todayInTimezone(timezone));
  await saveParsedCapture(supabase, linkedUser.user_id, regexResult);
  await sendTelegramMessage(chatId, aiFailureMessage());
  return NextResponse.json({ ok: true });
}

for (const item of outcome.items) {
  await saveParsedCapture(supabase, linkedUser.user_id, item);
}
await sendTelegramMessage(chatId, captureSavedMessage(outcome.items.length));
```

### 4. Message strings (`src/lib/telegram/messages.ts`)

- `captureSavedMessage(count: number)` returns:
  - `"Saved to your planner."` when `count === 1`
  - `` `Saved ${count} items to your planner.` `` when `count > 1`
- New `aiFailureMessage()` returns `"AI parsing failed — saved to inbox. Open it to fix the date manually."`
- Existing callers updated to pass `count`.

### 5. Env

- New: `ANTHROPIC_API_KEY` in `.env` and `.env.example`.
- Behavior when absent: `aiParseCapture` throws `AiParseError` immediately. The webhook treats it like any other AI failure: regex result saved, user told.

## Data Flow

1. User sends `"tommorow buy milk and call mohammed at 4pm"` (today = 2026-05-18, tz Asia/Gaza).
2. Webhook resolves timezone, computes `baseDateISO = "2026-05-18"`.
3. `parseCapture` returns `bucket: "inbox"` (no recognized date).
4. `shouldEscalateToAi` → true (regex inboxed it).
5. `aiParseCapture` returns:
   ```json
   [
     { "title": "buy milk", "item_type": "task", "item_date": "2026-05-19", "item_time": null, "block": "unsorted", "bucket": "weekly_spread" },
     { "title": "call mohammed", "item_type": "appointment", "item_date": "2026-05-19", "item_time": "16:00", "block": "afternoon", "bucket": "weekly_spread" }
   ]
   ```
6. Webhook inserts 2 rows, replies `"Saved 2 items to your planner."`.
7. User refreshes `/planner` and sees both under tomorrow.

## Error Handling

| Failure | Behavior |
|---|---|
| `ANTHROPIC_API_KEY` missing | Treated as AI error: regex result saved, user told |
| Network timeout (>8 s) | Same as above |
| HTTP 4xx/5xx from Anthropic | Same as above |
| Non-tool response | Same as above |
| Tool input fails schema validation | Same as above |
| Tool returns 0 items | Same as above (defensive — schema says minItems 1) |
| Item has invalid date string | That single item dropped; if all dropped, treat as AI failure |
| Regex throws (shouldn't, but) | Surface as 500 to Telegram (lets Telegram retry); existing behavior |

## Testing

All tests in `tests/planner/`. No real network calls.

### `tests/planner/ai-capture-parser.test.ts`

- Single-item happy path: mocked Anthropic returns one item → returns array of 1.
- Multi-item happy path: mocked returns two items → returns array of 2.
- Multilingual: input `"اشتري حليب بكرة"` → mocked returns one item with tomorrow's date.
- Missing API key → throws `AiParseError`.
- Network error → throws `AiParseError`.
- Non-tool response (text content only) → throws `AiParseError`.
- Tool input missing required fields → throws `AiParseError`.

### `tests/planner/capture.test.ts`

- `shouldEscalateToAi`: regex inbox → true; regex weekly_spread → false; regex weekly_spread + multi-item heuristic match → true; regex weekly_spread + no heuristic → false.
- `captureFromText`: regex confident → AI never called; regex inbox → AI called; AI throws → outcome shape includes regex fallback.

### Webhook test (existing `tests/telegram/...` if any, otherwise new)

- AI failure path: user gets failure message, regex result persisted.
- Multi-item success: 2 inserts, count message.

## Migration / Rollout

- No schema migration (existing `planner_items` columns suffice).
- Feature gate: presence of `ANTHROPIC_API_KEY` env var. If unset, system behaves like today (regex only, no AI escalation noise).
- No backfill of existing items.

## Open Questions

None — all clarifying questions answered during brainstorming on 2026-05-18.

## References

- Existing parser: `src/lib/planner/capture-parser.ts`
- Existing webhook: `src/app/api/telegram/webhook/route.ts`
- Existing messages: `src/lib/telegram/messages.ts`
- Anthropic SDK docs: https://docs.anthropic.com/en/api/messages
- Tool use: https://docs.anthropic.com/en/docs/build-with-claude/tool-use
