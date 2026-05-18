# Personal Planning App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a hosted personal planner MVP with a Saturday-start weekly spread, Telegram capture/reminders, Supabase-backed accounts, and safe storage for ambiguous tasks.

**Architecture:** Create a new Next.js App Router app in `Time-Manager/planner-app`. Use Supabase Auth/Postgres/RLS for multi-user-ready data, Next.js route handlers for Telegram and cron endpoints, Vercel Cron for periodic reminder scanning, and a small domain layer for parsing, placement, and reminder selection.

**Tech Stack:** Current stable Next.js App Router, TypeScript, Tailwind CSS, Supabase Auth/Postgres, Telegram Bot API webhooks, Vercel Cron Jobs, `@js-temporal/polyfill`, Vitest, Testing Library, Playwright.

---

## Context And References

- Approved design spec: `docs/superpowers/specs/2026-05-17-personal-planning-app-design.md`
- New app root: `Time-Manager/planner-app`
- Existing design artifacts remain untouched in `Time-Manager/*.md`.
- Official docs checked before choosing the stack:
  - Next.js App Router: https://nextjs.org/docs/app
  - Supabase Next.js Auth quickstart: https://supabase.com/docs/guides/auth/quickstarts/nextjs
  - Supabase Next.js v16 SSR guidance: https://supabase.com/docs/guides/ai-tools/ai-prompts/nextjs-supabase-auth
  - Telegram Bot API webhook behavior and `secret_token`: https://core.telegram.org/bots/api
  - Vercel Cron Jobs and `CRON_SECRET`: https://vercel.com/docs/cron-jobs

## File Structure

Create these focused units:

- `Time-Manager/planner-app/supabase/migrations/0001_initial_planner_schema.sql` defines planner tables, indexes, defaults, and RLS policies.
- `Time-Manager/planner-app/src/lib/planner/types.ts` owns planner enums and TypeScript types.
- `Time-Manager/planner-app/src/lib/planner/dates.ts` owns Saturday-start week/date helpers.
- `Time-Manager/planner-app/src/lib/planner/capture-parser.ts` owns Telegram text parsing and placement rules.
- `Time-Manager/planner-app/src/lib/planner/planner-repository.ts` owns Supabase reads/writes for planner items and weekly notes.
- `Time-Manager/planner-app/src/lib/telegram/linking.ts` owns one-time-code generation and verification.
- `Time-Manager/planner-app/src/lib/telegram/messages.ts` owns Telegram message text and send helpers.
- `Time-Manager/planner-app/src/app/api/telegram/webhook/route.ts` receives Telegram webhook updates.
- `Time-Manager/planner-app/src/lib/reminders/due-reminders.ts` selects reminder definitions due for a cron tick.
- `Time-Manager/planner-app/src/app/api/cron/reminders/route.ts` sends due reminders and logs delivery.
- `Time-Manager/planner-app/src/app/(app)/planner/page.tsx` renders the weekly spread.
- `Time-Manager/planner-app/src/components/planner/*` renders the weekly spread, day section, item rows, and quick edit forms.
- `Time-Manager/planner-app/src/app/(app)/inbox/page.tsx` renders Inbox and Future Notes.
- `Time-Manager/planner-app/src/app/(app)/settings/page.tsx` renders Telegram linking and reminder settings.
- `Time-Manager/planner-app/tests/**/*` contains unit, component, and route-handler tests.

## Task 1: Scaffold The App

**Files:**
- Create: `Time-Manager/planner-app/package.json`
- Create: `Time-Manager/planner-app/src/app/page.tsx`
- Create: `Time-Manager/planner-app/.env.example`
- Create: `Time-Manager/planner-app/vercel.json`
- Create: `Time-Manager/planner-app/vitest.config.ts`
- Create: `Time-Manager/planner-app/tests/setup.ts`
- Modify: `Time-Manager/planner-app/README.md`

- [ ] **Step 1: Create the Next.js/Supabase project**

Run:

```bash
cd /Users/mohammedhamada/Desktop/Development/Time-Manager
npx create-next-app@latest planner-app -e with-supabase
```

Expected: `planner-app` is created with App Router, TypeScript, Tailwind, Supabase SSR utilities, and auth pages.

- [ ] **Step 2: Initialize git inside the app root**

Run:

```bash
cd /Users/mohammedhamada/Desktop/Development/Time-Manager/planner-app
git init
git add .
git commit -m "chore: scaffold planner app"
```

Expected: first commit succeeds. The parent `/Users/mohammedhamada/Desktop/Development` is not a git repo, so this app keeps its own history.

- [ ] **Step 3: Install planner dependencies**

Run:

```bash
npm install @js-temporal/polyfill @tabler/icons-react zod
npm install -D vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event playwright
```

Expected: dependencies are added to `package.json`.

- [ ] **Step 4: Add test scripts and Vitest config**

Run:

```bash
npm pkg set scripts.lint="eslint ."
npm pkg set scripts.test="vitest run"
npm pkg set scripts.test:watch="vitest"
npm pkg set scripts.e2e="playwright test"
```

Create `Time-Manager/planner-app/vitest.config.ts`:

```ts
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url))
    }
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"]
  }
});
```

Create `Time-Manager/planner-app/tests/setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 5: Add environment template**

Create `Time-Manager/planner-app/.env.example`:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
TELEGRAM_BOT_TOKEN=
TELEGRAM_WEBHOOK_SECRET=
CRON_SECRET=
APP_URL=http://localhost:3000
```

- [ ] **Step 6: Add cron config**

Create `Time-Manager/planner-app/vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/reminders",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

- [ ] **Step 7: Verify baseline**

Run:

```bash
npm run lint
npm run build
```

Expected: both commands pass with the template app.

- [ ] **Step 8: Commit**

Run:

```bash
git add package.json package-lock.json .env.example vercel.json vitest.config.ts tests/setup.ts README.md
git commit -m "chore: configure planner runtime"
```

## Task 2: Add Database Schema And Row-Level Security

**Files:**
- Create: `Time-Manager/planner-app/supabase/migrations/0001_initial_planner_schema.sql`
- Create: `Time-Manager/planner-app/supabase/seed.sql`

- [ ] **Step 1: Write the schema migration**

Create `Time-Manager/planner-app/supabase/migrations/0001_initial_planner_schema.sql`:

```sql
create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  timezone text not null default 'Asia/Gaza',
  week_start_day smallint not null default 6 check (week_start_day between 0 and 6),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.telegram_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  telegram_chat_id bigint unique,
  telegram_user_id bigint unique,
  link_status text not null default 'pending' check (link_status in ('pending', 'linked', 'revoked')),
  one_time_code_hash text,
  code_expires_at timestamptz,
  linked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.planner_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  original_text text,
  item_type text not null default 'task' check (item_type in ('task', 'appointment', 'note')),
  item_date date,
  item_time time,
  block text not null default 'none' check (block in ('morning', 'afternoon', 'evening', 'unsorted', 'none')),
  bucket text not null default 'inbox' check (bucket in ('weekly_spread', 'inbox', 'future_notes')),
  status text not null default 'active' check (status in ('active', 'completed', 'deleted')),
  source text not null default 'web' check (source in ('web', 'telegram')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.weekly_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  week_start_date date not null,
  content text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, week_start_date)
);

create table public.reminder_definitions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  reminder_type text not null check (reminder_type in ('evening_planning', 'morning_check_in', 'weekly_reset')),
  local_time time not null,
  day_of_week smallint check (day_of_week between 0 and 6),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, reminder_type)
);

create table public.reminder_delivery_logs (
  id uuid primary key default gen_random_uuid(),
  reminder_definition_id uuid not null references public.reminder_definitions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  scheduled_for timestamptz not null,
  sent_at timestamptz,
  status text not null check (status in ('sent', 'failed', 'skipped')),
  failure_reason text,
  telegram_message_id bigint,
  created_at timestamptz not null default now(),
  unique (reminder_definition_id, scheduled_for)
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id);

  insert into public.reminder_definitions (user_id, reminder_type, local_time, day_of_week)
  values
    (new.id, 'evening_planning', '22:00', null),
    (new.id, 'morning_check_in', '09:00', null),
    (new.id, 'weekly_reset', '22:15', 5);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create index planner_items_user_date_idx on public.planner_items (user_id, item_date, status);
create index planner_items_user_bucket_idx on public.planner_items (user_id, bucket, status);
create index reminder_definitions_enabled_idx on public.reminder_definitions (enabled, local_time);

alter table public.profiles enable row level security;
alter table public.telegram_links enable row level security;
alter table public.planner_items enable row level security;
alter table public.weekly_notes enable row level security;
alter table public.reminder_definitions enable row level security;
alter table public.reminder_delivery_logs enable row level security;

create policy "profiles are self readable" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles are self editable" on public.profiles
  for update using (auth.uid() = id);

create policy "telegram links are self owned" on public.telegram_links
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "planner items are self owned" on public.planner_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "weekly notes are self owned" on public.weekly_notes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "reminders are self owned" on public.reminder_definitions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "delivery logs are self readable" on public.reminder_delivery_logs
  for select using (auth.uid() = user_id);
```

- [ ] **Step 2: Add seed reminders for manual local testing**

Create `Time-Manager/planner-app/supabase/seed.sql`:

```sql
-- Replace the UUID after creating a local test user.
-- insert into public.reminder_definitions (user_id, reminder_type, local_time, day_of_week)
-- values
--   ('00000000-0000-0000-0000-000000000000', 'evening_planning', '22:00', null),
--   ('00000000-0000-0000-0000-000000000000', 'morning_check_in', '09:00', null),
--   ('00000000-0000-0000-0000-000000000000', 'weekly_reset', '22:15', 5);
```

- [ ] **Step 3: Apply migration locally**

Run:

```bash
npx supabase db reset
```

Expected: schema applies and tables exist in the local Supabase database.

- [ ] **Step 4: Commit**

Run:

```bash
git add supabase
git commit -m "feat: add planner database schema"
```

## Task 3: Build Planner Domain Helpers

**Files:**
- Create: `Time-Manager/planner-app/src/lib/planner/types.ts`
- Create: `Time-Manager/planner-app/src/lib/planner/dates.ts`
- Create: `Time-Manager/planner-app/src/lib/planner/capture-parser.ts`
- Create: `Time-Manager/planner-app/tests/planner/dates.test.ts`
- Create: `Time-Manager/planner-app/tests/planner/capture-parser.test.ts`

- [ ] **Step 1: Write date tests**

Create `Time-Manager/planner-app/tests/planner/dates.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { getSaturdayWeekStart, inferBlockFromHour } from "@/lib/planner/dates";

describe("planner date helpers", () => {
  it("finds the Saturday week start for a midweek date", () => {
    expect(getSaturdayWeekStart("2026-05-20")).toBe("2026-05-16");
  });

  it("keeps Saturday as its own week start", () => {
    expect(getSaturdayWeekStart("2026-05-23")).toBe("2026-05-23");
  });

  it("infers day blocks from appointment hours", () => {
    expect(inferBlockFromHour(9)).toBe("morning");
    expect(inferBlockFromHour(15)).toBe("afternoon");
    expect(inferBlockFromHour(20)).toBe("evening");
  });
});
```

- [ ] **Step 2: Write capture parsing tests**

Create `Time-Manager/planner-app/tests/planner/capture-parser.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { parseCapture } from "@/lib/planner/capture-parser";

const base = "2026-05-17";

describe("parseCapture", () => {
  it("places clear date and block captures into the weekly spread", () => {
    expect(parseCapture("Tomorrow morning submit report", base)).toMatchObject({
      title: "submit report",
      bucket: "weekly_spread",
      block: "morning",
      itemDate: "2026-05-18",
      itemType: "task"
    });
  });

  it("treats timed captures as appointments and infers the block", () => {
    expect(parseCapture("Tuesday 4pm dentist", base)).toMatchObject({
      title: "dentist",
      bucket: "weekly_spread",
      block: "afternoon",
      itemDate: "2026-05-19",
      itemTime: "16:00",
      itemType: "appointment"
    });
  });

  it("stores vague future dates as future notes", () => {
    expect(parseCapture("Renew passport next month", base)).toMatchObject({
      title: "Renew passport next month",
      bucket: "future_notes",
      block: "none",
      itemDate: null
    });
  });

  it("stores captures without a date in Inbox", () => {
    expect(parseCapture("Buy printer ink", base)).toMatchObject({
      title: "Buy printer ink",
      bucket: "inbox",
      block: "none",
      itemDate: null
    });
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run:

```bash
npm run test -- tests/planner/dates.test.ts tests/planner/capture-parser.test.ts
```

Expected: fail because the planner helper modules do not exist.

- [ ] **Step 4: Implement planner types**

Create `Time-Manager/planner-app/src/lib/planner/types.ts`:

```ts
export type DayBlock = "morning" | "afternoon" | "evening" | "unsorted" | "none";
export type PlannerBucket = "weekly_spread" | "inbox" | "future_notes";
export type PlannerItemType = "task" | "appointment" | "note";

export type ParsedCapture = {
  title: string;
  originalText: string;
  itemType: PlannerItemType;
  itemDate: string | null;
  itemTime: string | null;
  block: DayBlock;
  bucket: PlannerBucket;
};
```

- [ ] **Step 5: Implement date helpers**

Create `Time-Manager/planner-app/src/lib/planner/dates.ts`:

```ts
import { Temporal } from "@js-temporal/polyfill";
import type { DayBlock } from "./types";

export function getSaturdayWeekStart(dateISO: string): string {
  const date = Temporal.PlainDate.from(dateISO);
  const daysSinceSaturday = date.dayOfWeek === 6 ? 0 : (date.dayOfWeek + 1) % 7;
  return date.subtract({ days: daysSinceSaturday }).toString();
}

export function inferBlockFromHour(hour: number): DayBlock {
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}

export function todayInTimezone(timezone: string): string {
  return Temporal.Now.zonedDateTimeISO(timezone).toPlainDate().toString();
}
```

- [ ] **Step 6: Implement capture parser**

Create `Time-Manager/planner-app/src/lib/planner/capture-parser.ts`:

```ts
import { Temporal } from "@js-temporal/polyfill";
import { inferBlockFromHour } from "./dates";
import type { DayBlock, ParsedCapture } from "./types";

const weekdayIndex = new Map([
  ["monday", 1],
  ["tuesday", 2],
  ["wednesday", 3],
  ["thursday", 4],
  ["friday", 5],
  ["saturday", 6],
  ["sunday", 7]
]);

export function parseCapture(text: string, baseDateISO: string): ParsedCapture {
  const originalText = text.trim();
  const lower = originalText.toLowerCase();
  const block = parseBlock(lower);
  const time = parseTime(lower);
  const date = parseDate(lower, baseDateISO);

  if (isVagueFuture(lower)) {
    return capture(originalText, originalText, "note", null, null, "none", "future_notes");
  }

  if (!date) {
    return capture(originalText, originalText, "task", null, null, "none", "inbox");
  }

  const finalBlock = block ?? (time ? inferBlockFromHour(Number(time.slice(0, 2))) : "unsorted");
  const title = cleanTitle(originalText);

  return capture(
    title,
    originalText,
    time ? "appointment" : "task",
    date,
    time,
    finalBlock,
    "weekly_spread"
  );
}

function capture(
  title: string,
  originalText: string,
  itemType: ParsedCapture["itemType"],
  itemDate: string | null,
  itemTime: string | null,
  block: DayBlock,
  bucket: ParsedCapture["bucket"]
): ParsedCapture {
  return { title, originalText, itemType, itemDate, itemTime, block, bucket };
}

function parseBlock(text: string): DayBlock | null {
  if (text.includes("morning")) return "morning";
  if (text.includes("afternoon")) return "afternoon";
  if (text.includes("evening") || text.includes("night")) return "evening";
  return null;
}

function parseTime(text: string): string | null {
  const match = text.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/);
  if (!match) return null;

  let hour = Number(match[1]);
  const minute = match[2] ?? "00";
  const marker = match[3];

  if (marker === "pm" && hour < 12) hour += 12;
  if (marker === "am" && hour === 12) hour = 0;

  if (hour > 23) return null;
  return `${hour.toString().padStart(2, "0")}:${minute}`;
}

function parseDate(text: string, baseDateISO: string): string | null {
  const base = Temporal.PlainDate.from(baseDateISO);
  if (text.includes("tomorrow")) return base.add({ days: 1 }).toString();
  if (text.includes("today")) return base.toString();

  for (const [name, dayOfWeek] of weekdayIndex.entries()) {
    if (text.includes(name)) {
      const offset = (dayOfWeek - base.dayOfWeek + 7) % 7 || 7;
      return base.add({ days: offset }).toString();
    }
  }

  return null;
}

function isVagueFuture(text: string): boolean {
  return text.includes("next month") || text.includes("someday") || text.includes("eventually");
}

function cleanTitle(text: string): string {
  return text
    .replace(/\b(today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi, "")
    .replace(/\b(morning|afternoon|evening|night)\b/gi, "")
    .replace(/\b\d{1,2}(?::\d{2})?\s*(am|pm)?\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}
```

- [ ] **Step 7: Run tests**

Run:

```bash
npm run test -- tests/planner/dates.test.ts tests/planner/capture-parser.test.ts
```

Expected: all tests pass.

- [ ] **Step 8: Commit**

Run:

```bash
git add src/lib/planner tests/planner
git commit -m "feat: add planner parsing helpers"
```

## Task 4: Add Planner Repository

**Files:**
- Create: `Time-Manager/planner-app/src/lib/planner/planner-repository.ts`
- Create: `Time-Manager/planner-app/tests/planner/planner-repository.test.ts`

- [ ] **Step 1: Write repository mapping tests**

Create `Time-Manager/planner-app/tests/planner/planner-repository.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { saveParsedCapture } from "@/lib/planner/planner-repository";

describe("saveParsedCapture", () => {
  it("inserts a parsed Telegram capture for the linked user", async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    const supabase = { from: vi.fn(() => ({ insert })) };

    await saveParsedCapture(supabase as never, "user-1", {
      title: "dentist",
      originalText: "Tuesday 4pm dentist",
      itemType: "appointment",
      itemDate: "2026-05-19",
      itemTime: "16:00",
      block: "afternoon",
      bucket: "weekly_spread"
    });

    expect(supabase.from).toHaveBeenCalledWith("planner_items");
    expect(insert).toHaveBeenCalledWith({
      user_id: "user-1",
      title: "dentist",
      original_text: "Tuesday 4pm dentist",
      item_type: "appointment",
      item_date: "2026-05-19",
      item_time: "16:00",
      block: "afternoon",
      bucket: "weekly_spread",
      source: "telegram"
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm run test -- tests/planner/planner-repository.test.ts
```

Expected: fail because `planner-repository.ts` does not exist.

- [ ] **Step 3: Implement repository**

Create `Time-Manager/planner-app/src/lib/planner/planner-repository.ts`:

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ParsedCapture } from "./types";

export async function saveParsedCapture(
  supabase: SupabaseClient,
  userId: string,
  parsed: ParsedCapture
) {
  const { error } = await supabase.from("planner_items").insert({
    user_id: userId,
    title: parsed.title,
    original_text: parsed.originalText,
    item_type: parsed.itemType,
    item_date: parsed.itemDate,
    item_time: parsed.itemTime,
    block: parsed.block,
    bucket: parsed.bucket,
    source: "telegram"
  });

  if (error) throw error;
}
```

- [ ] **Step 4: Run test**

Run:

```bash
npm run test -- tests/planner/planner-repository.test.ts
```

Expected: pass.

- [ ] **Step 5: Commit**

Run:

```bash
git add src/lib/planner/planner-repository.ts tests/planner/planner-repository.test.ts
git commit -m "feat: add planner repository"
```

## Task 5: Add Telegram Linking And Capture Webhook

**Files:**
- Create: `Time-Manager/planner-app/src/lib/telegram/linking.ts`
- Create: `Time-Manager/planner-app/src/lib/telegram/messages.ts`
- Create: `Time-Manager/planner-app/src/app/api/telegram/webhook/route.ts`
- Create: `Time-Manager/planner-app/tests/telegram/linking.test.ts`
- Create: `Time-Manager/planner-app/tests/telegram/messages.test.ts`

- [ ] **Step 1: Write linking tests**

Create `Time-Manager/planner-app/tests/telegram/linking.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { createLinkCode, hashLinkCode, tryCompleteLinkByCode } from "@/lib/telegram/linking";

describe("telegram linking", () => {
  it("creates a six digit code", () => {
    expect(createLinkCode()).toMatch(/^\d{6}$/);
  });

  it("hashes the same code consistently", async () => {
    await expect(hashLinkCode("123456")).resolves.toBe(await hashLinkCode("123456"));
  });

  it("links a pending Telegram code to the incoming chat", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: { id: "link-1" }, error: null });
    const updateEq = vi.fn().mockResolvedValue({ error: null });
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "telegram_links") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  gt: vi.fn(() => ({ maybeSingle }))
                }))
              }))
            })),
            update: vi.fn(() => ({
              eq: updateEq
            }))
          };
        }
        throw new Error(`unexpected table ${table}`);
      })
    };

    await expect(tryCompleteLinkByCode(supabase as never, "123456", 77, 88)).resolves.toBe(true);
    expect(updateEq).toHaveBeenCalledWith("id", "link-1");
  });
});
```

- [ ] **Step 2: Implement linking helpers**

Create `Time-Manager/planner-app/src/lib/telegram/linking.ts`:

```ts
import { createHash, randomInt } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

export function createLinkCode(): string {
  return randomInt(100000, 1000000).toString();
}

export async function hashLinkCode(code: string): Promise<string> {
  return createHash("sha256").update(code).digest("hex");
}

export async function tryCompleteLinkByCode(
  supabase: SupabaseClient,
  code: string,
  telegramUserId: number,
  telegramChatId: number
): Promise<boolean> {
  const now = new Date().toISOString();
  const codeHash = await hashLinkCode(code);
  const { data: pendingLink, error } = await supabase
    .from("telegram_links")
    .select("id")
    .eq("link_status", "pending")
    .eq("one_time_code_hash", codeHash)
    .gt("code_expires_at", now)
    .maybeSingle();

  if (error) throw error;
  if (!pendingLink) return false;

  const { error: updateError } = await supabase
    .from("telegram_links")
    .update({
      telegram_chat_id: telegramChatId,
      telegram_user_id: telegramUserId,
      link_status: "linked",
      linked_at: now,
      one_time_code_hash: null,
      code_expires_at: null
    })
    .eq("id", pendingLink.id);

  if (updateError) throw updateError;
  return true;
}
```

- [ ] **Step 3: Implement message helpers**

Create `Time-Manager/planner-app/tests/telegram/messages.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { captureSavedMessage, linkedMessage, unlinkedMessage } from "@/lib/telegram/messages";

describe("telegram messages", () => {
  it("explains linking when a chat is unknown", () => {
    expect(unlinkedMessage()).toContain("link your planner");
  });

  it("confirms saved captures briefly", () => {
    expect(captureSavedMessage()).toBe("Saved. It will appear in your planner.");
  });

  it("confirms account linking", () => {
    expect(linkedMessage()).toContain("linked");
  });
});
```

Create `Time-Manager/planner-app/src/lib/telegram/messages.ts`:

```ts
export function unlinkedMessage(): string {
  return "Please link your planner first. Sign in to the web app, open Settings, and send me your one-time code.";
}

export function captureSavedMessage(): string {
  return "Saved. It will appear in your planner.";
}

export function linkedMessage(): string {
  return "Your Telegram is linked to your planner. You can now send tasks and appointments here.";
}

export async function sendTelegramMessage(chatId: number, text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("Missing TELEGRAM_BOT_TOKEN");

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text })
  });

  if (!response.ok) {
    throw new Error(`Telegram sendMessage failed with ${response.status}`);
  }
}
```

- [ ] **Step 4: Implement webhook route**

Create `Time-Manager/planner-app/src/app/api/telegram/webhook/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseCapture } from "@/lib/planner/capture-parser";
import { saveParsedCapture } from "@/lib/planner/planner-repository";
import { todayInTimezone } from "@/lib/planner/dates";
import { tryCompleteLinkByCode } from "@/lib/telegram/linking";
import { captureSavedMessage, linkedMessage, sendTelegramMessage, unlinkedMessage } from "@/lib/telegram/messages";

type TelegramUpdate = {
  message?: {
    text?: string;
    chat: { id: number };
    from?: { id: number };
  };
};

export async function POST(request: NextRequest) {
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  const actualSecret = request.headers.get("x-telegram-bot-api-secret-token");
  if (expectedSecret && actualSecret !== expectedSecret) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const update = (await request.json()) as TelegramUpdate;
  const text = update.message?.text?.trim();
  const chatId = update.message?.chat.id;
  const telegramUserId = update.message?.from?.id;

  if (!text || !chatId || !telegramUserId) {
    return NextResponse.json({ ok: true });
  }

  const supabase = await createClient({ useServiceRole: true });
  const { data: link } = await supabase
    .from("telegram_links")
    .select("user_id, link_status")
    .eq("telegram_user_id", telegramUserId)
    .eq("link_status", "linked")
    .maybeSingle();

  if (!link) {
    if (/^\d{6}$/.test(text)) {
      const linked = await tryCompleteLinkByCode(supabase, text, telegramUserId, chatId);
      if (linked) {
        await sendTelegramMessage(chatId, linkedMessage());
        return NextResponse.json({ ok: true });
      }
    }

    await sendTelegramMessage(chatId, unlinkedMessage());
    return NextResponse.json({ ok: true });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("timezone")
    .eq("id", link.user_id)
    .single();

  const baseDate = todayInTimezone(profile?.timezone ?? "Asia/Gaza");
  const parsed = parseCapture(text, baseDate);
  await saveParsedCapture(supabase, link.user_id, parsed);
  await sendTelegramMessage(chatId, captureSavedMessage());

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 5: Add a service-role Supabase client overload if the template lacks it**

Modify `Time-Manager/planner-app/src/lib/supabase/server.ts` so route handlers can use the service key without user cookies:

```ts
import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export async function createClient(options?: { useServiceRole?: boolean }) {
  if (options?.useServiceRole) {
    return createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY!
    );
  }

  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Server Components cannot set cookies; route handlers and proxy can.
          }
        }
      }
    }
  );
}
```

- [ ] **Step 6: Run tests**

Run:

```bash
npm run test -- tests/telegram/linking.test.ts tests/telegram/messages.test.ts
```

Expected: pass.

- [ ] **Step 7: Commit**

Run:

```bash
git add src/lib/telegram src/app/api/telegram tests/telegram src/lib/supabase/server.ts
git commit -m "feat: add telegram capture webhook"
```

## Task 6: Add Reminder Selection And Cron Route

**Files:**
- Create: `Time-Manager/planner-app/src/lib/reminders/due-reminders.ts`
- Create: `Time-Manager/planner-app/src/lib/reminders/reminder-messages.ts`
- Create: `Time-Manager/planner-app/src/app/api/cron/reminders/route.ts`
- Create: `Time-Manager/planner-app/tests/reminders/due-reminders.test.ts`

- [ ] **Step 1: Write reminder selection tests**

Create `Time-Manager/planner-app/tests/reminders/due-reminders.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { isReminderDue, reminderSlotISO } from "@/lib/reminders/due-reminders";

describe("isReminderDue", () => {
  it("matches a daily reminder inside a five-minute cron window", () => {
    expect(isReminderDue({
      reminderType: "evening_planning",
      localTime: "22:00",
      dayOfWeek: null,
      timezone: "Asia/Gaza",
      nowISO: "2026-05-17T19:00:30Z"
    })).toBe(true);
  });

  it("matches Friday weekly reset only on Friday", () => {
    expect(isReminderDue({
      reminderType: "weekly_reset",
      localTime: "22:15",
      dayOfWeek: 5,
      timezone: "Asia/Gaza",
      nowISO: "2026-05-22T19:15:00Z"
    })).toBe(true);
  });

  it("rounds delivery logs to a stable five-minute slot", () => {
    expect(reminderSlotISO("2026-05-17T19:03:30Z")).toBe("2026-05-17T19:00:00Z");
  });
});
```

- [ ] **Step 2: Implement due reminder helper**

Create `Time-Manager/planner-app/src/lib/reminders/due-reminders.ts`:

```ts
import { Temporal } from "@js-temporal/polyfill";

type DueInput = {
  reminderType: string;
  localTime: string;
  dayOfWeek: number | null;
  timezone: string;
  nowISO: string;
};

export function isReminderDue(input: DueInput): boolean {
  const now = Temporal.Instant.from(input.nowISO).toZonedDateTimeISO(input.timezone);
  const [hour, minute] = input.localTime.split(":").map(Number);
  const sameTimeWindow = now.hour === hour && Math.abs(now.minute - minute) < 5;
  const sameDay = input.dayOfWeek === null || input.dayOfWeek === now.dayOfWeek % 7;
  return sameTimeWindow && sameDay;
}

export function reminderSlotISO(nowISO: string): string {
  const instant = Temporal.Instant.from(nowISO);
  const epochMilliseconds = Number(instant.epochMilliseconds);
  const fiveMinutes = 5 * 60 * 1000;
  return Temporal.Instant.fromEpochMilliseconds(
    Math.floor(epochMilliseconds / fiveMinutes) * fiveMinutes
  ).toString();
}
```

- [ ] **Step 3: Implement reminder messages**

Create `Time-Manager/planner-app/src/lib/reminders/reminder-messages.ts`:

```ts
export function reminderMessage(type: string, summaryLines: string[] = []): string {
  let message = "Plan tomorrow in your notebook: appointments, tasks, morning, afternoon, evening, and anything to prepare before sleep.";

  if (type === "morning_check_in") {
    message = "Open today's notebook section. Check appointments, choose the first thing for the morning, and start gently.";
  }

  if (type === "weekly_reset") {
    message = "Weekly reset: prepare your 8-section spread for Saturday through Friday. Review upcoming appointments, unfinished tasks, Inbox, and Future Notes.";
  }

  if (summaryLines.length === 0) return message;

  return `${message}\n\nSaved items:\n${summaryLines.map((line) => `- ${line}`).join("\n")}`;
}
```

- [ ] **Step 4: Implement cron route**

Create `Time-Manager/planner-app/src/app/api/cron/reminders/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Temporal } from "@js-temporal/polyfill";
import { createClient } from "@/lib/supabase/server";
import { isReminderDue, reminderSlotISO } from "@/lib/reminders/due-reminders";
import { reminderMessage } from "@/lib/reminders/reminder-messages";
import { sendTelegramMessage } from "@/lib/telegram/messages";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const nowISO = new Date().toISOString();
  const supabase = await createClient({ useServiceRole: true });
  const { data: reminders, error } = await supabase
    .from("reminder_definitions")
    .select("id, user_id, reminder_type, local_time, day_of_week, profiles(timezone)")
    .eq("enabled", true);

  if (error) throw error;

  for (const reminder of reminders ?? []) {
    const timezone = reminder.profiles?.timezone ?? "Asia/Gaza";
    const due = isReminderDue({
      reminderType: reminder.reminder_type,
      localTime: reminder.local_time,
      dayOfWeek: reminder.day_of_week,
      timezone,
      nowISO
    });

    if (!due) continue;

    const { data: telegramLink } = await supabase
      .from("telegram_links")
      .select("telegram_chat_id")
      .eq("user_id", reminder.user_id)
      .eq("link_status", "linked")
      .maybeSingle();

    const chatId = telegramLink?.telegram_chat_id;
    if (!chatId) continue;

    const scheduledFor = reminderSlotISO(nowISO);
    const { data: existingLog } = await supabase
      .from("reminder_delivery_logs")
      .select("id")
      .eq("reminder_definition_id", reminder.id)
      .eq("scheduled_for", scheduledFor)
      .maybeSingle();

    if (existingLog) continue;

    try {
      const summaryLines = await loadReminderSummaryLines(
        supabase,
        reminder.user_id,
        reminder.reminder_type,
        timezone,
        nowISO
      );
      await sendTelegramMessage(chatId, reminderMessage(reminder.reminder_type, summaryLines));
      await supabase.from("reminder_delivery_logs").insert({
        reminder_definition_id: reminder.id,
        user_id: reminder.user_id,
        scheduled_for: scheduledFor,
        sent_at: nowISO,
        status: "sent"
      });
    } catch (error) {
      await supabase.from("reminder_delivery_logs").insert({
        reminder_definition_id: reminder.id,
        user_id: reminder.user_id,
        scheduled_for: scheduledFor,
        status: "failed",
        failure_reason: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }

  return NextResponse.json({ ok: true });
}

async function loadReminderSummaryLines(
  supabase: SupabaseClient,
  userId: string,
  reminderType: string,
  timezone: string,
  nowISO: string
): Promise<string[]> {
  const today = Temporal.Instant.from(nowISO).toZonedDateTimeISO(timezone).toPlainDate();

  if (reminderType === "weekly_reset") {
    const start = today.add({ days: 1 });
    const end = start.add({ days: 6 });
    const { data: weeklyItems } = await supabase
      .from("planner_items")
      .select("title, item_date, item_time, bucket")
      .eq("user_id", userId)
      .neq("status", "deleted")
      .or(`and(item_date.gte.${start.toString()},item_date.lte.${end.toString()}),bucket.in.(inbox,future_notes)`)
      .order("item_date", { ascending: true });

    return (weeklyItems ?? []).slice(0, 12).map(formatSummaryLine);
  }

  const targetDate = reminderType === "evening_planning" ? today.add({ days: 1 }) : today;
  const { data: dayItems } = await supabase
    .from("planner_items")
    .select("title, item_date, item_time, bucket")
    .eq("user_id", userId)
    .eq("item_date", targetDate.toString())
    .neq("status", "deleted")
    .order("item_time", { ascending: true });

  return (dayItems ?? []).slice(0, 8).map(formatSummaryLine);
}

function formatSummaryLine(item: { title: string; item_date: string | null; item_time: string | null; bucket: string }): string {
  const prefix = item.item_date ? `${item.item_date}${item.item_time ? ` ${item.item_time}` : ""}` : item.bucket;
  return `${prefix}: ${item.title}`;
}
```

- [ ] **Step 5: Run tests**

Run:

```bash
npm run test -- tests/reminders/due-reminders.test.ts
```

Expected: pass.

- [ ] **Step 6: Commit**

Run:

```bash
git add src/lib/reminders src/app/api/cron/reminders tests/reminders vercel.json
git commit -m "feat: add reminder cron route"
```

## Task 7: Build Weekly Spread UI

**Files:**
- Create: `Time-Manager/planner-app/src/components/planner/weekly-spread.tsx`
- Create: `Time-Manager/planner-app/src/components/planner/day-section.tsx`
- Create: `Time-Manager/planner-app/src/components/planner/planner-item-row.tsx`
- Create: `Time-Manager/planner-app/src/app/(app)/planner/page.tsx`
- Create: `Time-Manager/planner-app/tests/components/weekly-spread.test.tsx`
- Modify: `Time-Manager/planner-app/src/app/globals.css`

- [ ] **Step 1: Add design tokens**

Add these CSS variables to `Time-Manager/planner-app/src/app/globals.css`:

```css
:root {
  --paper: #f8faf9;
  --paper-deep: #eef2f0;
  --paper-elevated: #ffffff;
  --ink: #25332d;
  --ink-soft: #66746e;
  --ink-faint: #94a19b;
  --rule: #d6ded9;
  --rule-strong: #c0ccc6;
  --accent: #397367;
  --accent-bg: #dfeee9;
  --accent-ink: #23483f;
  --warm: #8a5a44;
  --done: #94a19b;
}

.bg-paper-deep {
  background-color: var(--paper-deep);
}

.bg-paper-elevated {
  background-color: var(--paper-elevated);
}

.bg-accent {
  background-color: var(--accent);
}

.text-ink {
  color: var(--ink);
}

.text-ink-soft {
  color: var(--ink-soft);
}

.text-accent {
  color: var(--accent);
}

.text-done {
  color: var(--done);
}

.text-warn {
  color: var(--warm);
}

.border-rule {
  border-color: var(--rule);
}

.divide-rule > :not([hidden]) ~ :not([hidden]) {
  border-color: var(--rule);
}
```

- [ ] **Step 2: Write component test**

Create `Time-Manager/planner-app/tests/components/weekly-spread.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { WeeklySpread } from "@/components/planner/weekly-spread";

describe("WeeklySpread", () => {
  it("renders Saturday through Friday and weekly notes", () => {
    render(<WeeklySpread weekStartDate="2026-05-23" items={[]} weeklyNote="" />);
    for (const label of ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Weekly Notes"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });
});
```

- [ ] **Step 3: Implement item row**

Create `Time-Manager/planner-app/src/components/planner/planner-item-row.tsx`:

```tsx
import { IconClock, IconSquare, IconSquareCheck } from "@tabler/icons-react";

type PlannerItemRowProps = {
  title: string;
  itemTime?: string | null;
  completed?: boolean;
};

export function PlannerItemRow({ title, itemTime, completed }: PlannerItemRowProps) {
  const Icon = completed ? IconSquareCheck : IconSquare;

  return (
    <li className="flex min-h-8 items-center gap-2 border-b border-rule py-1 text-sm text-ink">
      <Icon aria-hidden size={14} className="shrink-0 text-ink-soft" />
      {itemTime ? <IconClock aria-hidden size={13} className="shrink-0 text-accent" /> : null}
      <span dir="auto" className={completed ? "text-done line-through" : ""}>{title}</span>
    </li>
  );
}
```

- [ ] **Step 4: Implement day section**

Create `Time-Manager/planner-app/src/components/planner/day-section.tsx`:

```tsx
import { PlannerItemRow } from "./planner-item-row";

type Item = {
  id: string;
  title: string;
  item_time: string | null;
  block: "morning" | "afternoon" | "evening" | "unsorted" | "none";
  status: "active" | "completed" | "deleted";
};

export function DaySection({ dayName, items }: { dayName: string; items: Item[] }) {
  const blocks = ["morning", "afternoon", "evening", "unsorted"] as const;

  return (
    <section className="rounded-md border border-rule bg-paper-elevated p-3">
      <h2 className="font-serif text-lg text-ink">{dayName}</h2>
      <div className="mt-3 space-y-3">
        {blocks.map((block) => (
          <div key={block}>
            <h3 className="text-xs capitalize text-ink-soft">{block}</h3>
            <ul className="mt-1">
              {items.filter((item) => item.block === block).map((item) => (
                <PlannerItemRow
                  key={item.id}
                  title={item.title}
                  itemTime={item.item_time}
                  completed={item.status === "completed"}
                />
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 5: Implement weekly spread**

Create `Time-Manager/planner-app/src/components/planner/weekly-spread.tsx`:

```tsx
import { Temporal } from "@js-temporal/polyfill";
import { DaySection } from "./day-section";

type Item = {
  id: string;
  title: string;
  item_date: string | null;
  item_time: string | null;
  block: "morning" | "afternoon" | "evening" | "unsorted" | "none";
  status: "active" | "completed" | "deleted";
};

const dayNames = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

export function WeeklySpread({
  weekStartDate,
  items,
  weeklyNote
}: {
  weekStartDate: string;
  items: Item[];
  weeklyNote: string;
}) {
  const start = Temporal.PlainDate.from(weekStartDate);

  return (
    <div className="grid gap-3 lg:grid-cols-4">
      {dayNames.map((dayName, index) => {
        const date = start.add({ days: index }).toString();
        return (
          <DaySection
            key={dayName}
            dayName={dayName}
            items={items.filter((item) => item.item_date === date)}
          />
        );
      })}
      <section className="rounded-md border border-rule bg-paper-elevated p-3">
        <h2 className="font-serif text-lg text-ink">Weekly Notes</h2>
        <p dir="auto" className="mt-3 whitespace-pre-wrap text-sm leading-6 text-ink-soft">{weeklyNote}</p>
      </section>
    </div>
  );
}
```

- [ ] **Step 6: Implement planner page**

Create `Time-Manager/planner-app/src/app/(app)/planner/page.tsx`:

```tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSaturdayWeekStart, todayInTimezone } from "@/lib/planner/dates";
import { WeeklySpread } from "@/components/planner/weekly-spread";

export default async function PlannerPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase.from("profiles").select("timezone").eq("id", user.id).single();
  const today = todayInTimezone(profile?.timezone ?? "Asia/Gaza");
  const weekStart = getSaturdayWeekStart(today);

  const { data: items } = await supabase
    .from("planner_items")
    .select("id, title, item_date, item_time, block, status")
    .eq("user_id", user.id)
    .eq("bucket", "weekly_spread")
    .neq("status", "deleted");

  const { data: note } = await supabase
    .from("weekly_notes")
    .select("content")
    .eq("user_id", user.id)
    .eq("week_start_date", weekStart)
    .maybeSingle();

  return (
    <main className="min-h-screen bg-paper-deep px-4 py-6 text-ink">
      <div className="mx-auto max-w-7xl">
        <h1 className="mb-4 font-serif text-2xl">Week of {weekStart}</h1>
        <WeeklySpread weekStartDate={weekStart} items={items ?? []} weeklyNote={note?.content ?? ""} />
      </div>
    </main>
  );
}
```

- [ ] **Step 7: Run component test**

Run:

```bash
npm run test -- tests/components/weekly-spread.test.tsx
```

Expected: pass.

- [ ] **Step 8: Commit**

Run:

```bash
git add src/components/planner src/app/'(app)'/planner tests/components src/app/globals.css
git commit -m "feat: render weekly planner spread"
```

## Task 8: Add Inbox, Future Notes, And Settings

**Files:**
- Create: `Time-Manager/planner-app/src/app/(app)/inbox/page.tsx`
- Create: `Time-Manager/planner-app/src/app/(app)/settings/page.tsx`
- Create: `Time-Manager/planner-app/src/app/(app)/settings/actions.ts`
- Create: `Time-Manager/planner-app/src/components/settings/telegram-link-card.tsx`
- Create: `Time-Manager/planner-app/tests/settings/link-code.test.ts`

- [ ] **Step 1: Write settings action test**

Create `Time-Manager/planner-app/tests/settings/link-code.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { createPendingTelegramLink } from "@/app/(app)/settings/actions";

describe("createPendingTelegramLink", () => {
  it("stores a hashed one-time code for the current user", async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const supabase = { from: vi.fn(() => ({ upsert })) };

    const code = await createPendingTelegramLink(supabase as never, "user-1", "123456");

    expect(code).toBe("123456");
    expect(supabase.from).toHaveBeenCalledWith("telegram_links");
    expect(upsert.mock.calls[0][0]).toMatchObject({
      user_id: "user-1",
      link_status: "pending"
    });
    expect(upsert.mock.calls[0][0].one_time_code_hash).not.toBe("123456");
  });
});
```

- [ ] **Step 2: Implement settings action**

Create `Time-Manager/planner-app/src/app/(app)/settings/actions.ts`:

```ts
"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createLinkCode, hashLinkCode } from "@/lib/telegram/linking";

export type LinkCodeState = {
  code?: string;
  error?: string;
};

export async function createPendingTelegramLink(
  supabase: SupabaseClient,
  userId: string,
  forcedCode?: string
): Promise<string> {
  const code = forcedCode ?? createLinkCode();
  const hash = await hashLinkCode(code);
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  const { error } = await supabase.from("telegram_links").upsert({
    user_id: userId,
    link_status: "pending",
    one_time_code_hash: hash,
    code_expires_at: expiresAt
  }, { onConflict: "user_id" });

  if (error) throw error;
  return code;
}

export async function requestTelegramLinkCode(
  _previousState: LinkCodeState,
  _formData: FormData
): Promise<LinkCodeState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Please sign in before linking Telegram." };
  }

  const code = await createPendingTelegramLink(supabase, user.id);
  return { code };
}
```

- [ ] **Step 3: Implement Inbox page**

Create `Time-Manager/planner-app/src/app/(app)/inbox/page.tsx`:

```tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function InboxPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: items } = await supabase
    .from("planner_items")
    .select("id, title, bucket, original_text")
    .eq("user_id", user.id)
    .in("bucket", ["inbox", "future_notes"])
    .neq("status", "deleted")
    .order("created_at", { ascending: false });

  return (
    <main className="min-h-screen bg-paper-deep px-4 py-6 text-ink">
      <div className="mx-auto max-w-3xl">
        <h1 className="font-serif text-2xl">Inbox & Future Notes</h1>
        <ul className="mt-4 divide-y divide-rule rounded-md border border-rule bg-paper-elevated">
          {(items ?? []).map((item) => (
            <li key={item.id} className="p-3">
              <div className="text-xs uppercase text-ink-soft">{item.bucket === "future_notes" ? "Future Notes" : "Inbox"}</div>
              <div dir="auto" className="mt-1 text-sm">{item.title}</div>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Implement Settings page**

Create `Time-Manager/planner-app/src/components/settings/telegram-link-card.tsx`:

```tsx
"use client";

import { useActionState } from "react";
import { requestTelegramLinkCode, type LinkCodeState } from "@/app/(app)/settings/actions";

export function TelegramLinkCard({ status }: { status: string }) {
  const [state, formAction, pending] = useActionState<LinkCodeState, FormData>(
    requestTelegramLinkCode,
    {}
  );

  return (
    <section className="rounded-md border border-rule bg-paper-elevated p-4">
      <h2 className="font-serif text-lg">Telegram</h2>
      <p className="mt-2 text-sm text-ink-soft">
        Status: {status === "linked" ? "Linked" : "Not linked"}
      </p>
      <form action={formAction} className="mt-4">
        <button
          className="rounded-md bg-accent px-3 py-2 text-sm text-white disabled:opacity-60"
          disabled={pending}
          type="submit"
        >
          {pending ? "Creating code..." : "Create one-time code"}
        </button>
      </form>
      {state.code ? (
        <p className="mt-3 rounded-md border border-rule bg-paper-deep p-3 text-sm">
          Send this code to the Telegram bot within 15 minutes: <strong>{state.code}</strong>
        </p>
      ) : null}
      {state.error ? <p className="mt-3 text-sm text-warn">{state.error}</p> : null}
    </section>
  );
}
```

Create `Time-Manager/planner-app/src/app/(app)/settings/page.tsx`:

```tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TelegramLinkCard } from "@/components/settings/telegram-link-card";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: link } = await supabase
    .from("telegram_links")
    .select("link_status, linked_at")
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <main className="min-h-screen bg-paper-deep px-4 py-6 text-ink">
      <div className="mx-auto max-w-2xl space-y-6">
        <h1 className="font-serif text-2xl">Settings</h1>
        <TelegramLinkCard status={link?.link_status ?? "not_linked"} />
        <section className="rounded-md border border-rule bg-paper-elevated p-4">
          <h2 className="font-serif text-lg">Reminder Defaults</h2>
          <ul className="mt-2 space-y-1 text-sm text-ink-soft">
            <li>Daily evening planning: 10:00 PM</li>
            <li>Daily morning check-in: 9:00 AM</li>
            <li>Friday weekly reset: 10:15 PM</li>
          </ul>
        </section>
      </div>
    </main>
  );
}
```

- [ ] **Step 5: Run tests**

Run:

```bash
npm run test -- tests/settings/link-code.test.ts
```

Expected: pass.

- [ ] **Step 6: Commit**

Run:

```bash
git add src/app/'(app)'/inbox src/app/'(app)'/settings src/components/settings tests/settings
git commit -m "feat: add inbox and settings screens"
```

## Task 9: Add Planner Item Mutations

**Files:**
- Create: `Time-Manager/planner-app/src/app/(app)/planner/actions.ts`
- Create: `Time-Manager/planner-app/tests/planner/item-actions.test.ts`
- Modify: `Time-Manager/planner-app/src/components/planner/planner-item-row.tsx`
- Modify: `Time-Manager/planner-app/src/components/planner/day-section.tsx`

- [ ] **Step 1: Write mutation tests**

Create `Time-Manager/planner-app/tests/planner/item-actions.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { updatePlannerItem } from "@/app/(app)/planner/actions";

describe("updatePlannerItem", () => {
  it("updates only the current user's item", async () => {
    const eqUser = vi.fn().mockResolvedValue({ error: null });
    const eqId = vi.fn(() => ({ eq: eqUser }));
    const update = vi.fn(() => ({ eq: eqId }));
    const supabase = { from: vi.fn(() => ({ update })) };

    await updatePlannerItem(supabase as never, "user-1", "item-1", {
      title: "new title",
      block: "evening"
    });

    expect(supabase.from).toHaveBeenCalledWith("planner_items");
    expect(update).toHaveBeenCalledWith({
      title: "new title",
      block: "evening"
    });
    expect(eqId).toHaveBeenCalledWith("id", "item-1");
    expect(eqUser).toHaveBeenCalledWith("user_id", "user-1");
  });
});
```

- [ ] **Step 2: Implement server actions**

Create `Time-Manager/planner-app/src/app/(app)/planner/actions.ts`:

```ts
"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { DayBlock } from "@/lib/planner/types";

type PlannerItemPatch = {
  title?: string;
  item_date?: string | null;
  block?: DayBlock;
  status?: "active" | "completed" | "deleted";
};

export async function updatePlannerItem(
  supabase: SupabaseClient,
  userId: string,
  itemId: string,
  patch: PlannerItemPatch
) {
  const { error } = await supabase
    .from("planner_items")
    .update(patch)
    .eq("id", itemId)
    .eq("user_id", userId);

  if (error) throw error;
}

async function currentUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  return { supabase, user };
}

export async function completePlannerItemAction(formData: FormData) {
  const itemId = String(formData.get("itemId"));
  const { supabase, user } = await currentUser();
  await updatePlannerItem(supabase, user.id, itemId, { status: "completed" });
  revalidatePath("/planner");
}

export async function deletePlannerItemAction(formData: FormData) {
  const itemId = String(formData.get("itemId"));
  const { supabase, user } = await currentUser();
  await updatePlannerItem(supabase, user.id, itemId, { status: "deleted" });
  revalidatePath("/planner");
}

export async function editPlannerItemAction(formData: FormData) {
  const itemId = String(formData.get("itemId"));
  const title = String(formData.get("title") ?? "").trim();
  const block = String(formData.get("block")) as DayBlock;
  const itemDate = String(formData.get("itemDate") ?? "");

  if (!title) throw new Error("Title is required");

  const { supabase, user } = await currentUser();
  await updatePlannerItem(supabase, user.id, itemId, {
    title,
    block,
    item_date: itemDate || null
  });
  revalidatePath("/planner");
}
```

- [ ] **Step 3: Add edit/complete/delete controls to item rows**

Modify `Time-Manager/planner-app/src/components/planner/planner-item-row.tsx`:

```tsx
import { IconDeviceFloppy, IconSquare, IconSquareCheck, IconTrash } from "@tabler/icons-react";
import { completePlannerItemAction, deletePlannerItemAction, editPlannerItemAction } from "@/app/(app)/planner/actions";

type PlannerItemRowProps = {
  id: string;
  title: string;
  itemDate?: string | null;
  itemTime?: string | null;
  block: "morning" | "afternoon" | "evening" | "unsorted" | "none";
  completed?: boolean;
};

export function PlannerItemRow({ id, title, itemDate, itemTime, block, completed }: PlannerItemRowProps) {
  const Icon = completed ? IconSquareCheck : IconSquare;

  return (
    <li className="border-b border-rule py-2 text-sm text-ink">
      <div className="flex items-center gap-2">
        <form action={completePlannerItemAction}>
          <input name="itemId" type="hidden" value={id} />
          <button aria-label="Complete item" className="text-ink-soft" type="submit">
            <Icon aria-hidden size={14} />
          </button>
        </form>
        <form action={editPlannerItemAction} className="grid flex-1 grid-cols-[1fr_auto_auto] gap-2">
          <input name="itemId" type="hidden" value={id} />
          <input name="itemDate" type="hidden" value={itemDate ?? ""} />
          <input
            className="min-w-0 bg-transparent outline-none"
            defaultValue={title}
            dir="auto"
            name="title"
          />
          <select className="bg-transparent text-xs text-ink-soft" defaultValue={block} name="block">
            <option value="morning">Morning</option>
            <option value="afternoon">Afternoon</option>
            <option value="evening">Evening</option>
            <option value="unsorted">Unsorted</option>
          </select>
          <button aria-label="Save item" className="text-accent" type="submit">
            <IconDeviceFloppy aria-hidden size={14} />
          </button>
        </form>
        {itemTime ? <span className="text-xs text-accent">{itemTime}</span> : null}
        <form action={deletePlannerItemAction}>
          <input name="itemId" type="hidden" value={id} />
          <button aria-label="Delete item" className="text-ink-soft" type="submit">
            <IconTrash aria-hidden size={14} />
          </button>
        </form>
      </div>
    </li>
  );
}
```

- [ ] **Step 4: Pass IDs and dates from day sections**

Modify the `PlannerItemRow` call in `Time-Manager/planner-app/src/components/planner/day-section.tsx`:

```tsx
<PlannerItemRow
  key={item.id}
  id={item.id}
  title={item.title}
  itemDate={item.item_date}
  itemTime={item.item_time}
  block={item.block}
  completed={item.status === "completed"}
/>
```

Also add `item_date: string | null;` to the local `Item` type in `day-section.tsx`.

- [ ] **Step 5: Run tests**

Run:

```bash
npm run test -- tests/planner/item-actions.test.ts
```

Expected: pass.

- [ ] **Step 6: Commit**

Run:

```bash
git add src/app/'(app)'/planner/actions.ts src/components/planner tests/planner/item-actions.test.ts
git commit -m "feat: add planner item actions"
```

## Task 10: Add Verification And Deployment Notes

**Files:**
- Create: `Time-Manager/planner-app/tests/e2e/planner.spec.ts`
- Modify: `Time-Manager/planner-app/package.json`
- Modify: `Time-Manager/planner-app/README.md`

- [ ] **Step 1: Verify scripts**

Ensure `Time-Manager/planner-app/package.json` contains these scripts from Task 1:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint .",
    "test": "vitest run",
    "test:watch": "vitest",
    "e2e": "playwright test"
  }
}
```

- [ ] **Step 2: Add Playwright smoke test**

Create `Time-Manager/planner-app/tests/e2e/planner.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

test("planner redirects unauthenticated users to login", async ({ page }) => {
  await page.goto("/planner");
  await expect(page).toHaveURL(/auth/);
});
```

- [ ] **Step 3: Document local and production setup**

Add this section to `Time-Manager/planner-app/README.md`:

````md
## Planner Setup

1. Create a Supabase project.
2. Copy `.env.example` to `.env.local`.
3. Add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_SECRET_KEY`.
4. Create a Telegram bot with BotFather and set `TELEGRAM_BOT_TOKEN`.
5. Generate `TELEGRAM_WEBHOOK_SECRET` and `CRON_SECRET`.
6. Deploy to Vercel.
7. Set the Telegram webhook:

```bash
curl "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
  -d "url=$APP_URL/api/telegram/webhook" \
  -d "secret_token=$TELEGRAM_WEBHOOK_SECRET"
```

8. Confirm Vercel Cron invokes `/api/cron/reminders` every five minutes.
````

- [ ] **Step 4: Run full verification**

Run:

```bash
npm run lint
npm run test
npm run build
```

Expected: all commands pass.

- [ ] **Step 5: Commit**

Run:

```bash
git add package.json package-lock.json tests/e2e README.md
git commit -m "docs: add planner deployment notes"
```

## Spec Coverage Review

- Hosted web app: Tasks 1, 7, 8, 9, 10.
- Backend API: Tasks 5 and 6.
- Database and multi-user ownership: Task 2.
- Telegram account linking: Tasks 5 and 8.
- Natural-language capture with safe fallback: Tasks 3, 4, 5.
- Weekly spread from Saturday to Friday: Tasks 3 and 7.
- Morning/Afternoon/Evening/Unsorted blocks: Tasks 3 and 7.
- Inbox and Future Notes: Tasks 3 and 8.
- Default reminders at 10:00 PM, 9:00 AM, Friday 10:15 PM: Tasks 2 and 6.
- Timezone-aware reminder selection: Task 6.
- Reminder delivery logging: Tasks 2 and 6.
- Quiet Productivity visual direction: Task 7.
- Edit, move, complete, and delete planner items: Task 9.
- Private first user, multi-user ready: Tasks 2, 5, 7, 8, 9.
