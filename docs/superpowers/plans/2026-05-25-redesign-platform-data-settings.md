# Redesign Platform Data And Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add schema-backed platform state for display preferences, calendar connection state, note collections, editable notes, and redesigned Settings controls.

**Architecture:** Add one append-only Supabase migration for new platform tables. Use existing `reminder_definitions` as the reminder preferences table because it already stores reminder type, local time, day of week, and enabled state. Add small repository helpers under `src/lib/settings/`, `src/lib/calendar/`, and `src/lib/notes/`, then wire server actions in the route folders.

**Tech Stack:** Supabase Postgres and RLS, Next.js 16 Server Actions, React 19, Zod, Vitest, Testing Library.

---

## File Structure

- Create `supabase/migrations/0003_platform_redesign_state.sql`: user preferences, calendar connections, note collections, notes, triggers, RLS, and default profile hook updates.
- Create `tests/database/platform-redesign-migration.test.ts`: static migration assertions.
- Create `src/lib/settings/preferences.ts`: default-safe preferences and reminder helpers.
- Create `tests/settings/preferences.test.ts`: repository helper tests with mocked Supabase chains.
- Create `src/lib/calendar/connections.ts`: calendar connection helpers.
- Create `tests/calendar/connections.test.ts`: mocked repository tests.
- Create `src/lib/notes/notes-repository.ts`: note collection and note helpers.
- Create `tests/notes/notes-repository.test.ts`: mocked repository tests.
- Modify `src/app/(app)/settings/actions.ts`: display, reminder, and calendar connection actions.
- Modify `src/app/(app)/settings/page.tsx`: redesigned settings sections.
- Modify `src/components/settings/telegram-link-card.tsx`: align with shared section primitives.
- Create `src/components/settings/settings-sections.tsx`: display, reminder, and calendar sections.
- Test `tests/components/settings-sections.test.tsx`.
- Modify `src/app/(app)/notes/page.tsx`: include note collections and notes once schema helpers exist.
- Modify `src/components/notes/notes-dashboard.tsx`: render collections and editable notes.

---

### Task 1: Add Platform State Migration

**Files:**
- Create: `supabase/migrations/0003_platform_redesign_state.sql`
- Test: `tests/database/platform-redesign-migration.test.ts`

- [ ] **Step 1: Write the failing migration assertion test**

```ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/0003_platform_redesign_state.sql"),
  "utf8",
);

describe("platform redesign migration", () => {
  it("creates platform tables with RLS policies", () => {
    expect(migration).toContain("create table public.user_preferences");
    expect(migration).toContain("create table public.calendar_connections");
    expect(migration).toContain("create table public.note_collections");
    expect(migration).toContain("create table public.notes");
    expect(migration).toContain("alter table public.user_preferences enable row level security");
    expect(migration).toContain("calendar_connections_manage_own");
    expect(migration).toContain("note_collections_manage_own");
    expect(migration).toContain("notes_manage_own");
  });

  it("updates the new-user hook without replacing existing reminder definitions", () => {
    expect(migration).toContain("insert into public.user_preferences");
    expect(migration).toContain("insert into public.note_collections");
    expect(migration).not.toContain("create table public.reminder_preferences");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/database/platform-redesign-migration.test.ts`

Expected: FAIL because the migration file does not exist.

- [ ] **Step 3: Add the migration**

```sql
create table public.user_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  theme text not null default 'system' check (theme in ('light', 'dark', 'system')),
  default_calendar_view text not null default 'day' check (default_calendar_view in ('day')),
  quick_add_default_bucket text not null default 'weekly_spread' check (quick_add_default_bucket in ('weekly_spread', 'inbox', 'future_notes')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.calendar_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  provider text not null check (provider in ('google')),
  status text not null default 'not_connected' check (status in ('not_connected', 'connected', 'error', 'revoked')),
  provider_account_email text,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider)
);

create table public.note_collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  collection_id uuid references public.note_collections(id) on delete set null,
  title text not null,
  content text not null default '',
  status text not null default 'active' check (status in ('active', 'archived', 'deleted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index notes_user_status_updated_idx
  on public.notes (user_id, status, updated_at desc);

create index note_collections_user_sort_idx
  on public.note_collections (user_id, sort_order, name);

create trigger user_preferences_set_updated_at
  before update on public.user_preferences
  for each row execute function public.set_updated_at();

create trigger calendar_connections_set_updated_at
  before update on public.calendar_connections
  for each row execute function public.set_updated_at();

create trigger note_collections_set_updated_at
  before update on public.note_collections
  for each row execute function public.set_updated_at();

create trigger notes_set_updated_at
  before update on public.notes
  for each row execute function public.set_updated_at();

alter table public.user_preferences enable row level security;
alter table public.calendar_connections enable row level security;
alter table public.note_collections enable row level security;
alter table public.notes enable row level security;

create policy "user_preferences_manage_own"
  on public.user_preferences for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "calendar_connections_manage_own"
  on public.calendar_connections for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "note_collections_manage_own"
  on public.note_collections for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "notes_manage_own"
  on public.notes for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;

  insert into public.reminder_definitions (user_id, reminder_type, local_time, day_of_week)
  values
    (new.id, 'evening_planning', time '22:00', null),
    (new.id, 'morning_check_in', time '09:00', null),
    (new.id, 'weekly_reset', time '22:15', 5)
  on conflict (user_id, reminder_type) do nothing;

  insert into public.user_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  insert into public.note_collections (user_id, name, sort_order)
  values (new.id, 'Future notes', 0)
  on conflict (user_id, name) do nothing;

  return new;
end;
$$;
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/database/platform-redesign-migration.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/0003_platform_redesign_state.sql tests/database/platform-redesign-migration.test.ts
git commit -m "feat: add platform redesign state schema"
```

---

### Task 2: Add Preference And Reminder Helpers

**Files:**
- Create: `src/lib/settings/preferences.ts`
- Test: `tests/settings/preferences.test.ts`

- [ ] **Step 1: Write failing preference helper tests**

```ts
import { describe, expect, it, vi } from "vitest";

import {
  getDisplayPreferences,
  updateDisplayPreferences,
  updateReminderDefinition,
} from "@/lib/settings/preferences";

describe("settings preferences", () => {
  it("returns safe display defaults when no row exists", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const eq = vi.fn().mockReturnValue({ maybeSingle });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ select });

    const result = await getDisplayPreferences({ from } as never, "user-123");

    expect(from).toHaveBeenCalledWith("user_preferences");
    expect(result).toEqual({
      default_calendar_view: "day",
      quick_add_default_bucket: "weekly_spread",
      theme: "system",
    });
  });

  it("upserts display preferences for the user", async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const from = vi.fn().mockReturnValue({ upsert });

    await updateDisplayPreferences({ from } as never, "user-123", {
      theme: "dark",
    });

    expect(from).toHaveBeenCalledWith("user_preferences");
    expect(upsert).toHaveBeenCalledWith(
      {
        theme: "dark",
        user_id: "user-123",
      },
      { onConflict: "user_id" },
    );
  });

  it("updates existing reminder definitions", async () => {
    const secondEq = vi.fn().mockResolvedValue({ error: null });
    const firstEq = vi.fn().mockReturnValue({ eq: secondEq });
    const update = vi.fn().mockReturnValue({ eq: firstEq });
    const from = vi.fn().mockReturnValue({ update });

    await updateReminderDefinition({ from } as never, "user-123", "morning_check_in", {
      enabled: false,
      local_time: "08:30",
    });

    expect(from).toHaveBeenCalledWith("reminder_definitions");
    expect(update).toHaveBeenCalledWith({
      enabled: false,
      local_time: "08:30",
    });
    expect(firstEq).toHaveBeenCalledWith("user_id", "user-123");
    expect(secondEq).toHaveBeenCalledWith("reminder_type", "morning_check_in");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/settings/preferences.test.ts`

Expected: FAIL because `preferences.ts` does not exist.

- [ ] **Step 3: Implement settings helpers**

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

const displaySchema = z.object({
  theme: z.enum(["light", "dark", "system"]).optional(),
  default_calendar_view: z.literal("day").optional(),
  quick_add_default_bucket: z.enum(["weekly_spread", "inbox", "future_notes"]).optional(),
});

export type DisplayPreferences = {
  theme: "light" | "dark" | "system";
  default_calendar_view: "day";
  quick_add_default_bucket: "weekly_spread" | "inbox" | "future_notes";
};

export const defaultDisplayPreferences: DisplayPreferences = {
  theme: "system",
  default_calendar_view: "day",
  quick_add_default_bucket: "weekly_spread",
};

export async function getDisplayPreferences(
  supabase: SupabaseClient,
  userId: string,
): Promise<DisplayPreferences> {
  const { data, error } = await supabase
    .from("user_preferences")
    .select("theme,default_calendar_view,quick_add_default_bucket")
    .eq("user_id", userId)
    .maybeSingle<Partial<DisplayPreferences>>();

  if (error) {
    throw error;
  }

  return {
    ...defaultDisplayPreferences,
    ...data,
  };
}

export async function updateDisplayPreferences(
  supabase: SupabaseClient,
  userId: string,
  patch: Partial<DisplayPreferences>,
) {
  const parsed = displaySchema.parse(patch);
  const { error } = await supabase
    .from("user_preferences")
    .upsert({ user_id: userId, ...parsed }, { onConflict: "user_id" });

  if (error) {
    throw error;
  }
}

export async function updateReminderDefinition(
  supabase: SupabaseClient,
  userId: string,
  reminderType: "evening_planning" | "morning_check_in" | "weekly_reset",
  patch: { enabled?: boolean; local_time?: string; day_of_week?: number | null },
) {
  const { error } = await supabase
    .from("reminder_definitions")
    .update(patch)
    .eq("user_id", userId)
    .eq("reminder_type", reminderType);

  if (error) {
    throw error;
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/settings/preferences.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/settings/preferences.ts tests/settings/preferences.test.ts
git commit -m "feat: add settings preference helpers"
```

---

### Task 3: Add Calendar Connection Helpers

**Files:**
- Create: `src/lib/calendar/connections.ts`
- Test: `tests/calendar/connections.test.ts`

- [ ] **Step 1: Write failing calendar connection tests**

```ts
import { describe, expect, it, vi } from "vitest";

import { getCalendarConnection, updateCalendarConnection } from "@/lib/calendar/connections";

describe("calendar connections", () => {
  it("returns not connected state when no row exists", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const eqProvider = vi.fn().mockReturnValue({ maybeSingle });
    const eqUser = vi.fn().mockReturnValue({ eq: eqProvider });
    const select = vi.fn().mockReturnValue({ eq: eqUser });
    const from = vi.fn().mockReturnValue({ select });

    const result = await getCalendarConnection({ from } as never, "user-123");

    expect(result).toEqual({
      provider: "google",
      provider_account_email: null,
      status: "not_connected",
      last_synced_at: null,
    });
  });

  it("upserts calendar connection state", async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const from = vi.fn().mockReturnValue({ upsert });

    await updateCalendarConnection({ from } as never, "user-123", {
      provider_account_email: "user@example.com",
      status: "connected",
    });

    expect(upsert).toHaveBeenCalledWith(
      {
        provider: "google",
        provider_account_email: "user@example.com",
        status: "connected",
        user_id: "user-123",
      },
      { onConflict: "user_id,provider" },
    );
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/calendar/connections.test.ts`

Expected: FAIL because `connections.ts` does not exist.

- [ ] **Step 3: Implement calendar connection helpers**

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

const connectionPatchSchema = z.object({
  provider_account_email: z.string().email().nullable().optional(),
  status: z.enum(["not_connected", "connected", "error", "revoked"]),
});

export type CalendarConnection = {
  provider: "google";
  status: "not_connected" | "connected" | "error" | "revoked";
  provider_account_email: string | null;
  last_synced_at: string | null;
};

export const defaultCalendarConnection: CalendarConnection = {
  provider: "google",
  status: "not_connected",
  provider_account_email: null,
  last_synced_at: null,
};

export async function getCalendarConnection(
  supabase: SupabaseClient,
  userId: string,
): Promise<CalendarConnection> {
  const { data, error } = await supabase
    .from("calendar_connections")
    .select("provider,status,provider_account_email,last_synced_at")
    .eq("user_id", userId)
    .eq("provider", "google")
    .maybeSingle<CalendarConnection>();

  if (error) {
    throw error;
  }

  return data ?? defaultCalendarConnection;
}

export async function updateCalendarConnection(
  supabase: SupabaseClient,
  userId: string,
  patch: Omit<Partial<CalendarConnection>, "provider" | "last_synced_at"> & {
    status: CalendarConnection["status"];
  },
) {
  const parsed = connectionPatchSchema.parse(patch);
  const { error } = await supabase
    .from("calendar_connections")
    .upsert(
      {
        user_id: userId,
        provider: "google",
        ...parsed,
      },
      { onConflict: "user_id,provider" },
    );

  if (error) {
    throw error;
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/calendar/connections.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/calendar/connections.ts tests/calendar/connections.test.ts
git commit -m "feat: add calendar connection helpers"
```

---

### Task 4: Add Notes Repository Helpers

**Files:**
- Create: `src/lib/notes/notes-repository.ts`
- Test: `tests/notes/notes-repository.test.ts`

- [ ] **Step 1: Write failing notes repository tests**

```ts
import { describe, expect, it, vi } from "vitest";

import { createNote, listNoteCollections } from "@/lib/notes/notes-repository";

describe("notes repository", () => {
  it("lists note collections for the user", async () => {
    const order = vi.fn().mockResolvedValue({
      data: [{ id: "collection-1", name: "Ideas", sort_order: 0 }],
      error: null,
    });
    const eq = vi.fn().mockReturnValue({ order });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ select });

    const result = await listNoteCollections({ from } as never, "user-123");

    expect(from).toHaveBeenCalledWith("note_collections");
    expect(result).toEqual([{ id: "collection-1", name: "Ideas", sort_order: 0 }]);
  });

  it("creates active notes in a collection", async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    const from = vi.fn().mockReturnValue({ insert });

    await createNote({ from } as never, "user-123", {
      collection_id: "collection-1",
      content: "Write launch notes.",
      title: "Launch",
    });

    expect(from).toHaveBeenCalledWith("notes");
    expect(insert).toHaveBeenCalledWith({
      collection_id: "collection-1",
      content: "Write launch notes.",
      status: "active",
      title: "Launch",
      user_id: "user-123",
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/notes/notes-repository.test.ts`

Expected: FAIL because `notes-repository.ts` does not exist.

- [ ] **Step 3: Implement notes helpers**

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

const createNoteSchema = z.object({
  collection_id: z.string().uuid().nullable(),
  content: z.string(),
  title: z.string().min(1),
});

export type NoteCollection = {
  id: string;
  name: string;
  sort_order: number;
};

export async function listNoteCollections(
  supabase: SupabaseClient,
  userId: string,
): Promise<NoteCollection[]> {
  const { data, error } = await supabase
    .from("note_collections")
    .select("id,name,sort_order")
    .eq("user_id", userId)
    .order("sort_order", { ascending: true });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function createNote(
  supabase: SupabaseClient,
  userId: string,
  input: { collection_id: string | null; title: string; content: string },
) {
  const parsed = createNoteSchema.parse(input);
  const { error } = await supabase.from("notes").insert({
    user_id: userId,
    collection_id: parsed.collection_id,
    title: parsed.title,
    content: parsed.content,
    status: "active",
  });

  if (error) {
    throw error;
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/notes/notes-repository.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/notes/notes-repository.ts tests/notes/notes-repository.test.ts
git commit -m "feat: add notes repository helpers"
```

---

### Task 5: Wire Redesigned Settings Sections

**Files:**
- Modify: `src/app/(app)/settings/actions.ts`
- Modify: `src/app/(app)/settings/page.tsx`
- Modify: `src/components/settings/telegram-link-card.tsx`
- Create: `src/components/settings/settings-sections.tsx`
- Test: `tests/components/settings-sections.test.tsx`

- [ ] **Step 1: Write failing settings section tests**

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  CalendarSettingsSection,
  DisplaySettingsSection,
  ReminderSettingsSection,
} from "@/components/settings/settings-sections";

describe("settings sections", () => {
  it("renders display preferences", () => {
    render(<DisplaySettingsSection preferences={{ default_calendar_view: "day", quick_add_default_bucket: "weekly_spread", theme: "system" }} />);

    expect(screen.getByRole("heading", { name: "Display" })).toBeInTheDocument();
    expect(screen.getByLabelText("System")).toBeChecked();
  });

  it("renders reminder preferences from reminder definitions", () => {
    render(
      <ReminderSettingsSection
        reminders={[
          {
            enabled: true,
            local_time: "09:00:00",
            reminder_type: "morning_check_in",
          },
        ]}
      />,
    );

    expect(screen.getByRole("heading", { name: "Reminders" })).toBeInTheDocument();
    expect(screen.getByText("Morning check-in")).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: "Morning check-in" })).toBeChecked();
  });

  it("renders calendar connection state", () => {
    render(
      <CalendarSettingsSection
        connection={{
          last_synced_at: null,
          provider: "google",
          provider_account_email: null,
          status: "not_connected",
        }}
      />,
    );

    expect(screen.getByRole("heading", { name: "Calendar Sync" })).toBeInTheDocument();
    expect(screen.getByText("Not connected")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/components/settings-sections.test.tsx`

Expected: FAIL because `settings-sections.tsx` does not exist.

- [ ] **Step 3: Implement settings sections**

Create three focused components that use `Section`, `SectionRow`, `Toggle`, and button primitives. Reminder rows post to settings actions and preserve the existing reminder types.

- [ ] **Step 4: Add settings actions**

Add server actions for:

- `updateDisplayPreferencesAction`
- `updateReminderDefinitionAction`
- `updateCalendarConnectionAction`

Each action should call `createClient()`, get the current user, validate form fields with Zod or helper schemas, call the repository helper, then `revalidatePath("/settings")`.

- [ ] **Step 5: Update settings page**

Fetch:

- `telegram_links`
- `reminder_definitions`
- `user_preferences` via `getDisplayPreferences`
- `calendar_connections` via `getCalendarConnection`

Render the redesigned settings sections and keep `signOutAction`.

- [ ] **Step 6: Run settings tests**

Run: `npx vitest run tests/components/settings-sections.test.tsx tests/settings/preferences.test.ts tests/calendar/connections.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add 'src/app/(app)/settings/actions.ts' 'src/app/(app)/settings/page.tsx' src/components/settings/telegram-link-card.tsx src/components/settings/settings-sections.tsx tests/components/settings-sections.test.tsx
git commit -m "feat: redesign settings sections"
```

---

### Task 6: Extend Notes Route With Collections

**Files:**
- Modify: `src/app/(app)/notes/page.tsx`
- Modify: `src/components/notes/notes-dashboard.tsx`
- Test: `tests/components/notes-dashboard.test.tsx`

- [ ] **Step 1: Extend the notes dashboard test**

```tsx
it("renders note collections when provided", () => {
  render(
    <NotesDashboard
      collections={[{ id: "collection-1", name: "Ideas", sort_order: 0 }]}
      futureNotes={[]}
      inboxItems={[]}
      notes={[{ id: "note-1", title: "Launch", content: "Write launch notes.", collection_id: "collection-1" }]}
      weeklyNotes={[]}
    />,
  );

  expect(screen.getByText("Ideas")).toBeInTheDocument();
  expect(screen.getByText("Launch")).toBeInTheDocument();
  expect(screen.getByText("Write launch notes.")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/components/notes-dashboard.test.tsx`

Expected: FAIL because `NotesDashboard` does not accept collection and note props yet.

- [ ] **Step 3: Update Notes page and dashboard**

Use `listNoteCollections` and a direct Supabase query for active `notes`. Continue rendering existing future notes, inbox items, and weekly notes. Keep empty states visible when collections have no notes.

- [ ] **Step 4: Run notes tests**

Run: `npx vitest run tests/components/notes-dashboard.test.tsx tests/notes/notes-repository.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add 'src/app/(app)/notes/page.tsx' src/components/notes/notes-dashboard.tsx tests/components/notes-dashboard.test.tsx
git commit -m "feat: show note collections in notes"
```

---

### Task 7: Final Verification

**Files:**
- No source edits in this task.

- [ ] **Step 1: Run unit and component tests for this plan**

Run: `npx vitest run tests/database/platform-redesign-migration.test.ts tests/settings/preferences.test.ts tests/calendar/connections.test.ts tests/notes/notes-repository.test.ts tests/components/settings-sections.test.tsx tests/components/notes-dashboard.test.tsx`

Expected: PASS.

- [ ] **Step 2: Run full unit suite**

Run: `npm run test`

Expected: PASS.

- [ ] **Step 3: Run production build**

Run: `npm run build`

Expected: PASS.

- [ ] **Step 4: Run browser verification**

Start the dev server with `npm run dev`, open `/settings` and `/notes`, verify desktop and mobile widths, and capture screenshots for the handoff.

