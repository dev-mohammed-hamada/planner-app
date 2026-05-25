# Redesign Planner Surfaces Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the redesigned Week, Calendar, Notes, and global Quick add surfaces on top of the existing planner data and capture pipeline.

**Architecture:** Keep `planner_items` and `weekly_notes` as the source of truth for this phase. Add a shared Quick add server action under `src/app/(app)/actions.ts`, a client modal under `src/components/planner/quick-add-modal.tsx`, Calendar route components under `src/components/calendar/`, Notes route components under `src/components/notes/`, and restyle Week components using the notebook visual language.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind CSS 4, Supabase SSR client, `@js-temporal/polyfill`, Zod, Tabler Icons, Vitest, Testing Library, Playwright.

---

## File Structure

- Create `src/lib/planner/quick-add-overrides.ts`: validates and applies manual Quick add overrides to parsed capture items.
- Create `src/app/(app)/actions.ts`: global Quick add server action.
- Create `src/components/planner/quick-add-modal.tsx`: client modal launched from `AppShell`.
- Modify `src/components/app/app-shell.tsx`: wire Quick add button to modal.
- Modify `src/components/planner/weekly-spread.tsx`: notebook spread layout.
- Modify `src/components/planner/day-section.tsx`: notebook day section.
- Modify `src/components/planner/planner-item-row.tsx`: compact ruled item row.
- Create `src/app/(app)/calendar/page.tsx`: day view route.
- Create `src/components/calendar/day-view.tsx`: day view shell and rows.
- Create `src/app/(app)/notes/page.tsx`: notes route backed by existing planner and weekly note data.
- Create `src/components/notes/notes-dashboard.tsx`: notes panels for future notes, inbox captures, and weekly note archive.
- Test `tests/planner/quick-add-overrides.test.ts`.
- Test `tests/planner/quick-add-actions.test.ts`.
- Test `tests/components/quick-add-modal.test.tsx`.
- Test `tests/components/calendar-day-view.test.tsx`.
- Test `tests/components/notes-dashboard.test.tsx`.
- Update `tests/components/weekly-spread.test.tsx`.
- Update `tests/e2e/planner.spec.ts`.

---

### Task 1: Add Quick Add Override Logic

**Files:**
- Create: `src/lib/planner/quick-add-overrides.ts`
- Test: `tests/planner/quick-add-overrides.test.ts`

- [ ] **Step 1: Write the failing override tests**

```ts
import { describe, expect, it } from "vitest";

import { applyQuickAddOverrides } from "@/lib/planner/quick-add-overrides";
import type { ParsedCapture } from "@/lib/planner/types";

const baseItem: ParsedCapture = {
  title: "Call Sarah",
  originalText: "tomorrow call Sarah at 2pm",
  itemType: "task",
  itemDate: "2026-05-26",
  itemTime: "14:00",
  block: "afternoon",
  bucket: "weekly_spread",
};

describe("applyQuickAddOverrides", () => {
  it("applies date, time, block, bucket, and item type overrides", () => {
    const result = applyQuickAddOverrides(baseItem, {
      block: "morning",
      bucket: "weekly_spread",
      itemDate: "2026-05-27",
      itemTime: "09:30",
      itemType: "appointment",
    });

    expect(result).toEqual({
      ...baseItem,
      block: "morning",
      bucket: "weekly_spread",
      itemDate: "2026-05-27",
      itemTime: "09:30",
      itemType: "appointment",
    });
  });

  it("moves items without a date to inbox and none block", () => {
    const result = applyQuickAddOverrides(baseItem, {
      itemDate: null,
      itemTime: null,
    });

    expect(result.bucket).toBe("inbox");
    expect(result.block).toBe("none");
    expect(result.itemDate).toBeNull();
    expect(result.itemTime).toBeNull();
  });

  it("rejects invalid time strings", () => {
    expect(() =>
      applyQuickAddOverrides(baseItem, {
        itemTime: "9:30",
      }),
    ).toThrow("Time must use HH:MM format.");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/planner/quick-add-overrides.test.ts`

Expected: FAIL because `quick-add-overrides.ts` does not exist.

- [ ] **Step 3: Implement override validation**

```ts
import { z } from "zod";

import type {
  DayBlock,
  ParsedCapture,
  PlannerBucket,
  PlannerItemType,
} from "@/lib/planner/types";

const overrideSchema = z.object({
  block: z.enum(["morning", "afternoon", "evening", "unsorted", "none"]).optional(),
  bucket: z.enum(["weekly_spread", "inbox", "future_notes"]).optional(),
  itemDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  itemTime: z.string().regex(/^\d{2}:\d{2}$/, "Time must use HH:MM format.").nullable().optional(),
  itemType: z.enum(["task", "appointment", "note"]).optional(),
});

export type QuickAddOverrides = {
  block?: DayBlock;
  bucket?: PlannerBucket;
  itemDate?: string | null;
  itemTime?: string | null;
  itemType?: PlannerItemType;
};

export function applyQuickAddOverrides(
  item: ParsedCapture,
  overrides: QuickAddOverrides,
): ParsedCapture {
  const parsed = overrideSchema.parse(overrides);
  const next: ParsedCapture = {
    ...item,
    block: parsed.block ?? item.block,
    bucket: parsed.bucket ?? item.bucket,
    itemDate: parsed.itemDate === undefined ? item.itemDate : parsed.itemDate,
    itemTime: parsed.itemTime === undefined ? item.itemTime : parsed.itemTime,
    itemType: parsed.itemType ?? item.itemType,
  };

  if (!next.itemDate) {
    return {
      ...next,
      block: "none",
      bucket: next.bucket === "future_notes" ? "future_notes" : "inbox",
      itemTime: null,
    };
  }

  return {
    ...next,
    bucket: "weekly_spread",
    block: next.block === "none" ? "unsorted" : next.block,
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/planner/quick-add-overrides.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/planner/quick-add-overrides.ts tests/planner/quick-add-overrides.test.ts
git commit -m "feat: add quick add override validation"
```

---

### Task 2: Replace Inline Capture With Global Quick Add Modal

**Files:**
- Create: `src/app/(app)/actions.ts`
- Create: `src/components/planner/quick-add-modal.tsx`
- Modify: `src/components/app/app-shell.tsx`
- Modify: `src/components/planner/weekly-spread.tsx`
- Test: `tests/planner/quick-add-actions.test.ts`
- Test: `tests/components/quick-add-modal.test.tsx`

- [ ] **Step 1: Write the failing global action test**

```ts
import { revalidatePath } from "next/cache";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/planner/capture", () => ({
  captureFromText: vi.fn(),
}));

vi.mock("@/lib/planner/planner-repository", () => ({
  saveParsedCapture: vi.fn().mockResolvedValue(undefined),
}));

import { createQuickAddAction } from "@/app/(app)/actions";
import { captureFromText } from "@/lib/planner/capture";
import { saveParsedCapture } from "@/lib/planner/planner-repository";
import { createClient } from "@/lib/supabase/server";

function buildSupabase() {
  const profileQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({
      data: { timezone: "Asia/Gaza" },
      error: null,
    }),
  };

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "user-123" } },
      }),
    },
    from: vi.fn().mockReturnValue(profileQuery),
  };
}

describe("createQuickAddAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("saves captures through the existing parser and revalidates redesigned routes", async () => {
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(buildSupabase());
    (captureFromText as ReturnType<typeof vi.fn>).mockResolvedValue({
      source: "regex",
      items: [
        {
          title: "Call Sarah",
          originalText: "tomorrow call Sarah",
          itemType: "task",
          itemDate: "2026-05-26",
          itemTime: null,
          block: "unsorted",
          bucket: "weekly_spread",
        },
      ],
    });

    const formData = new FormData();
    formData.set("captureText", "tomorrow call Sarah");
    formData.set("itemDate", "2026-05-27");
    formData.set("itemTime", "09:30");
    formData.set("block", "morning");

    const state = await createQuickAddAction({}, formData);

    expect(saveParsedCapture).toHaveBeenCalledWith(
      expect.anything(),
      "user-123",
      expect.objectContaining({
        block: "morning",
        itemDate: "2026-05-27",
        itemTime: "09:30",
      }),
      "web",
    );
    expect(revalidatePath).toHaveBeenCalledWith("/planner");
    expect(revalidatePath).toHaveBeenCalledWith("/calendar");
    expect(revalidatePath).toHaveBeenCalledWith("/notes");
    expect(state).toEqual({ message: "Saved to your planner." });
  });
});
```

- [ ] **Step 2: Write the failing modal component test**

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");

  return {
    ...actual,
    useActionState: () => [{}, vi.fn(), false],
  };
});

import { QuickAddModal } from "@/components/planner/quick-add-modal";

describe("QuickAddModal", () => {
  it("opens, shows manual overrides, and closes", async () => {
    const user = userEvent.setup();

    render(<QuickAddModal />);

    await user.click(screen.getByRole("button", { name: "Quick add" }));

    expect(screen.getByRole("dialog", { name: "Quick add" })).toBeInTheDocument();
    expect(screen.getByLabelText("Capture text")).toBeInTheDocument();
    expect(screen.getByLabelText("Date")).toBeInTheDocument();
    expect(screen.getByLabelText("Time")).toBeInTheDocument();
    expect(screen.getByLabelText("Block")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("dialog", { name: "Quick add" })).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npx vitest run tests/planner/quick-add-actions.test.ts tests/components/quick-add-modal.test.tsx`

Expected: FAIL because the global action and modal do not exist.

- [ ] **Step 4: Implement the global action**

Move the reusable pieces from `src/app/(app)/planner/actions.ts` into `src/app/(app)/actions.ts`, keep `currentUser()` private to the action file, apply overrides with `applyQuickAddOverrides`, and revalidate `/planner`, `/calendar`, `/notes`, and `/inbox`.

```ts
export type QuickAddActionState = {
  message?: string;
  error?: string;
};
```

```ts
function revalidatePlannerSurfaces() {
  revalidatePath("/planner");
  revalidatePath("/calendar");
  revalidatePath("/notes");
  revalidatePath("/inbox");
}
```

- [ ] **Step 5: Implement the modal**

Create a client component with a launch button, fixed overlay, `role="dialog"`, capture textarea, date input, time input, block select, bucket select, cancel button, and submit button. Use `useActionState(createQuickAddAction, {})`.

```tsx
<textarea
  aria-label="Capture text"
  className="tm-field min-h-28 resize-y text-lg"
  name="captureText"
  placeholder="Review Q3 financials with Sarah @14:00 #tomorrow"
/>
```

- [ ] **Step 6: Wire the modal into `AppShell`**

Replace the shell's static Quick add button with `<QuickAddModal />`. Keep the mobile and desktop navigation unchanged.

- [ ] **Step 7: Remove inline quick capture from Week**

Remove `WebsiteCaptureForm` from `WeeklySpread`. Keep `WebsiteCaptureForm` in the tree only if tests still import it; otherwise delete it and update imports.

- [ ] **Step 8: Run the tests to verify they pass**

Run: `npx vitest run tests/planner/quick-add-overrides.test.ts tests/planner/quick-add-actions.test.ts tests/components/quick-add-modal.test.tsx tests/planner/web-capture-actions.test.ts`

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add 'src/app/(app)/actions.ts' src/components/planner/quick-add-modal.tsx src/components/app/app-shell.tsx src/components/planner/weekly-spread.tsx tests/planner/quick-add-actions.test.ts tests/components/quick-add-modal.test.tsx
git commit -m "feat: add global quick add modal"
```

---

### Task 3: Build Calendar Day View

**Files:**
- Create: `src/app/(app)/calendar/page.tsx`
- Create: `src/components/calendar/day-view.tsx`
- Test: `tests/components/calendar-day-view.test.tsx`

- [ ] **Step 1: Write the failing day view component test**

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CalendarDayView } from "@/components/calendar/day-view";

describe("CalendarDayView", () => {
  it("renders timed, untimed, completed, and empty ruled rows", () => {
    render(
      <CalendarDayView
        dateISO="2026-05-26"
        items={[
          {
            id: "1",
            title: "Morning sync",
            item_date: "2026-05-26",
            item_time: "09:00:00",
            block: "morning",
            status: "active",
          },
          {
            id: "2",
            title: "Draft roadmap",
            item_date: "2026-05-26",
            item_time: null,
            block: "unsorted",
            status: "completed",
          },
        ]}
      />,
    );

    expect(screen.getByRole("heading", { name: "Tuesday" })).toBeInTheDocument();
    expect(screen.getByText("09:00")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Morning sync")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Draft roadmap")).toHaveClass("line-through");
    expect(screen.getAllByTestId("empty-calendar-row")).toHaveLength(4);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/components/calendar-day-view.test.tsx`

Expected: FAIL because `CalendarDayView` does not exist.

- [ ] **Step 3: Implement `CalendarDayView`**

Use `PlannerItemRow` for item rendering and add empty ruled rows until there are at least six rows. Format day names with `Intl.DateTimeFormat` using UTC, matching the current component style.

```tsx
export type CalendarDayItem = {
  id: string;
  title: string;
  item_date: string | null;
  item_time: string | null;
  block: DayBlock;
  status: "active" | "completed" | "deleted";
};
```

- [ ] **Step 4: Implement `/calendar` page**

Use `requireInvitedUser("/calendar")`, read profile timezone, parse `searchParams.date` when present, otherwise use `todayInTimezone(timezone)`, and query active/non-deleted `planner_items` for that `item_date`. Use Temporal for previous and next day links.

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run tests/components/calendar-day-view.test.tsx`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add 'src/app/(app)/calendar/page.tsx' src/components/calendar/day-view.tsx tests/components/calendar-day-view.test.tsx
git commit -m "feat: add calendar day view"
```

---

### Task 4: Build Notes Route From Existing Data

**Files:**
- Create: `src/app/(app)/notes/page.tsx`
- Create: `src/components/notes/notes-dashboard.tsx`
- Test: `tests/components/notes-dashboard.test.tsx`

- [ ] **Step 1: Write the failing notes dashboard test**

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { NotesDashboard } from "@/components/notes/notes-dashboard";

describe("NotesDashboard", () => {
  it("renders future notes, inbox captures, and weekly note archive", () => {
    render(
      <NotesDashboard
        futureNotes={[
          {
            id: "future-1",
            title: "Someday plan garden layout",
            created_at: "2026-05-25T10:00:00Z",
          },
        ]}
        inboxItems={[
          {
            id: "inbox-1",
            title: "Buy printer ink",
            created_at: "2026-05-25T11:00:00Z",
          },
        ]}
        weeklyNotes={[
          {
            id: "week-1",
            content: "Follow up with design agency.",
            week_start_date: "2026-05-23",
          },
        ]}
      />,
    );

    expect(screen.getByRole("heading", { name: "Notes" })).toBeInTheDocument();
    expect(screen.getByText("Someday plan garden layout")).toBeInTheDocument();
    expect(screen.getByText("Buy printer ink")).toBeInTheDocument();
    expect(screen.getByText("Follow up with design agency.")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/components/notes-dashboard.test.tsx`

Expected: FAIL because `NotesDashboard` does not exist.

- [ ] **Step 3: Implement `NotesDashboard`**

Render three sections: Future notes, Inbox captures, and Weekly archive. Use existing planner item ids and text; do not query new notes tables in this phase.

- [ ] **Step 4: Implement `/notes` page**

Use `requireInvitedUser("/notes")`. Query:

```ts
supabase
  .from("planner_items")
  .select("id,title,bucket,created_at")
  .eq("user_id", user.id)
  .neq("status", "deleted")
  .in("bucket", ["inbox", "future_notes"])
  .order("created_at", { ascending: false });
```

Query `weekly_notes` for recent notes ordered by `week_start_date` descending.

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run tests/components/notes-dashboard.test.tsx`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add 'src/app/(app)/notes/page.tsx' src/components/notes/notes-dashboard.tsx tests/components/notes-dashboard.test.tsx
git commit -m "feat: add notes dashboard"
```

---

### Task 5: Restyle Week As Notebook Spread

**Files:**
- Modify: `src/components/planner/weekly-spread.tsx`
- Modify: `src/components/planner/day-section.tsx`
- Modify: `src/components/planner/planner-item-row.tsx`
- Test: `tests/components/weekly-spread.test.tsx`

- [ ] **Step 1: Extend the failing weekly spread test**

```tsx
it("renders the notebook spread shell", () => {
  render(<WeeklySpread items={[]} weekStartDate="2026-05-23" weeklyNote="" />);

  expect(screen.getByTestId("notebook-spread")).toBeInTheDocument();
  expect(screen.getByText("Saturday")).toBeInTheDocument();
  expect(screen.getByText("Weekly Notes")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/components/weekly-spread.test.tsx`

Expected: FAIL because the notebook spread test id does not exist.

- [ ] **Step 3: Implement the notebook spread shell**

Use a desk background, two-page responsive grid, center gutter on large screens, paper gradient, ruled day sections, and compact rows. Preserve all existing item actions and hidden form fields.

```tsx
<div
  className="mx-auto w-full max-w-[1400px] overflow-hidden rounded-xl bg-[var(--tm-rule)] shadow-[0_10px_25px_-5px_rgba(0,0,0,0.12)] lg:grid lg:grid-cols-2"
  data-testid="notebook-spread"
>
```

- [ ] **Step 4: Run the weekly spread test**

Run: `npx vitest run tests/components/weekly-spread.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/planner/weekly-spread.tsx src/components/planner/day-section.tsx src/components/planner/planner-item-row.tsx tests/components/weekly-spread.test.tsx
git commit -m "feat: restyle week as notebook spread"
```

---

### Task 6: Verify Redesigned Surface Flow

**Files:**
- Modify: `tests/e2e/planner.spec.ts`

- [ ] **Step 1: Add protected route redirect e2e coverage**

```ts
test("protected redesigned routes redirect unauthenticated users to login", async ({ page }) => {
  for (const route of ["/planner", "/calendar", "/notes", "/settings"]) {
    await page.goto(route);
    await expect(page).toHaveURL(new RegExp(`/auth/login\\?next=%2F${route.slice(1)}`));
  }
});
```

- [ ] **Step 2: Run the e2e test with the dev server available**

Run: `npm run e2e -- tests/e2e/planner.spec.ts`

Expected: PASS when the dev server is reachable.

- [ ] **Step 3: Run focused unit and component tests**

Run: `npx vitest run tests/planner/quick-add-overrides.test.ts tests/planner/quick-add-actions.test.ts tests/components/quick-add-modal.test.tsx tests/components/calendar-day-view.test.tsx tests/components/notes-dashboard.test.tsx tests/components/weekly-spread.test.tsx`

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/planner.spec.ts
git commit -m "test: cover redesigned protected routes"
```

