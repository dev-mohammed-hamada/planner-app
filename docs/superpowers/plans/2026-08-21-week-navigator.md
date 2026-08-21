# Week Navigator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add prev/next/today week navigation to `/planner` via a `?week=YYYY-MM-DD` query param, with controls in both the header and the footer of the notebook spread.

**Architecture:** URL query param is the single source of truth. A pure helper (`resolveWeekParam`) normalizes any input to a Saturday-anchored ISO date. `PlannerPage` (server) reads the param, snaps it, fetches for that week, and hands both the target week and today's week to `WeeklySpread`. A new `WeekNavigator` server component renders the links in two variants.

**Tech Stack:** Next.js 16 App Router (server components + `<Link>`), React 19, `@js-temporal/polyfill`, Tailwind CSS 4, Tabler Icons, Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-08-21-week-navigator-design.md`

**File Structure:**

| File | Responsibility | Change |
|---|---|---|
| `src/lib/planner/dates.ts` | Add `resolveWeekParam(input, today)` helper | Modify |
| `tests/planner/dates.test.ts` | Cover `resolveWeekParam` cases | Modify |
| `src/components/planner/week-navigator.tsx` | Render prev/today/next links (header + footer variants) | Create |
| `tests/components/week-navigator.test.tsx` | Cover navigator hrefs, Today visibility, variant differences | Create |
| `src/components/planner/weekly-spread.tsx` | Accept `currentWeekStartDate`, render navigator in header and footer | Modify |
| `tests/components/weekly-spread.test.tsx` | Cover both navigator placements | Modify |
| `src/app/(app)/planner/page.tsx` | Await `searchParams`, resolve week, pass `currentWeekStartDate` down | Modify |

---

## Task 1: `resolveWeekParam` helper

**Files:**
- Modify: `src/lib/planner/dates.ts`
- Test: `tests/planner/dates.test.ts`

- [ ] **Step 1: Write the failing tests**

Edit the import at the top of `tests/planner/dates.test.ts`. Old:

```ts
import { getSaturdayWeekStart, inferBlockFromHour } from "@/lib/planner/dates";
```

New:

```ts
import {
  getSaturdayWeekStart,
  inferBlockFromHour,
  resolveWeekParam,
} from "@/lib/planner/dates";
```

Append a second `describe` block below the existing one (keep the existing `describe("planner date helpers", …)` untouched):

```ts
describe("resolveWeekParam", () => {
  it("passes through a Saturday input", () => {
    expect(resolveWeekParam("2026-05-16", "2026-08-21")).toBe("2026-05-16");
  });

  it("snaps a midweek input to the enclosing Saturday", () => {
    expect(resolveWeekParam("2026-05-20", "2026-08-21")).toBe("2026-05-16");
  });

  it("falls back to today's Saturday when input is undefined", () => {
    expect(resolveWeekParam(undefined, "2026-08-21")).toBe("2026-08-15");
  });

  it("falls back to today's Saturday when input is garbage", () => {
    expect(resolveWeekParam("not-a-date", "2026-08-21")).toBe("2026-08-15");
  });

  it("falls back to today's Saturday when input is a malformed ISO", () => {
    expect(resolveWeekParam("2026-99-99", "2026-08-21")).toBe("2026-08-15");
  });

  it("falls back to today's Saturday when input is an empty string", () => {
    expect(resolveWeekParam("", "2026-08-21")).toBe("2026-08-15");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```
npx vitest run tests/planner/dates.test.ts
```

Expected: 6 new tests fail (export `resolveWeekParam` does not exist).

- [ ] **Step 3: Implement the helper**

Append to `src/lib/planner/dates.ts`:

```ts
export function resolveWeekParam(
  input: string | undefined,
  today: string,
): string {
  if (!input) {
    return getSaturdayWeekStart(today);
  }

  try {
    return getSaturdayWeekStart(Temporal.PlainDate.from(input).toString());
  } catch {
    return getSaturdayWeekStart(today);
  }
}
```

Ensure `Temporal` is already imported at the top:

```ts
import { Temporal } from "@js-temporal/polyfill";
```

(It is — do not duplicate.)

- [ ] **Step 4: Run tests to verify they pass**

```
npx vitest run tests/planner/dates.test.ts
```

Expected: all tests pass (existing + 6 new).

- [ ] **Step 5: Commit**

```
git add src/lib/planner/dates.ts tests/planner/dates.test.ts
git commit -m "feat: add resolveWeekParam helper for week navigation"
```

---

## Task 2: `WeekNavigator` component

**Files:**
- Create: `src/components/planner/week-navigator.tsx`
- Test: `tests/components/week-navigator.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `tests/components/week-navigator.test.tsx`:

```tsx
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { WeekNavigator } from "@/components/planner/week-navigator";

describe("WeekNavigator", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders prev and next hrefs anchored on the shown week", () => {
    render(
      <WeekNavigator
        weekStartDate="2026-08-15"
        currentWeekStartDate="2026-08-15"
        variant="header"
      />,
    );

    const prev = screen.getByRole("link", { name: /previous week/i });
    const next = screen.getByRole("link", { name: /next week/i });

    expect(prev).toHaveAttribute("href", "/planner?week=2026-08-08");
    expect(next).toHaveAttribute("href", "/planner?week=2026-08-22");
  });

  it("hides the Today link when already on the current week", () => {
    render(
      <WeekNavigator
        weekStartDate="2026-08-15"
        currentWeekStartDate="2026-08-15"
        variant="header"
      />,
    );

    expect(screen.queryByRole("link", { name: /today/i })).not.toBeInTheDocument();
  });

  it("shows a Today link back to /planner when off the current week", () => {
    render(
      <WeekNavigator
        weekStartDate="2026-08-22"
        currentWeekStartDate="2026-08-15"
        variant="header"
      />,
    );

    const today = screen.getByRole("link", { name: /today/i });
    expect(today).toHaveAttribute("href", "/planner");
  });

  it("shows the human-readable week label in header variant", () => {
    render(
      <WeekNavigator
        weekStartDate="2026-08-15"
        currentWeekStartDate="2026-08-15"
        variant="header"
      />,
    );

    expect(screen.getByText(/Week of August 15/i)).toBeInTheDocument();
  });

  it("omits the label in footer variant", () => {
    render(
      <WeekNavigator
        weekStartDate="2026-08-15"
        currentWeekStartDate="2026-08-15"
        variant="footer"
      />,
    );

    expect(screen.queryByText(/Week of August 15/i)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /previous week/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /next week/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```
npx vitest run tests/components/week-navigator.test.tsx
```

Expected: all 5 tests fail (module not found).

- [ ] **Step 3: Implement the component**

Create `src/components/planner/week-navigator.tsx`:

```tsx
import { Temporal } from "@js-temporal/polyfill";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import Link from "next/link";

type Variant = "header" | "footer";

type WeekNavigatorProps = {
  weekStartDate: string;
  currentWeekStartDate: string;
  variant: Variant;
};

function shiftWeek(weekStartDate: string, deltaDays: number): string {
  return Temporal.PlainDate.from(weekStartDate).add({ days: deltaDays }).toString();
}

function formatWeekLabel(weekStartDate: string): string {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(`${weekStartDate}T00:00:00Z`));
}

export function WeekNavigator({
  weekStartDate,
  currentWeekStartDate,
  variant,
}: WeekNavigatorProps) {
  const prevHref = `/planner?week=${shiftWeek(weekStartDate, -7)}`;
  const nextHref = `/planner?week=${shiftWeek(weekStartDate, 7)}`;
  const isCurrentWeek = weekStartDate === currentWeekStartDate;

  const linkBase =
    "inline-flex items-center justify-center rounded-md border border-[var(--tm-rule-strong)] bg-[var(--tm-paper-elevated)] text-[var(--tm-text)] transition-colors hover:bg-[var(--tm-paper-deep)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tm-secondary)]";

  if (variant === "footer") {
    return (
      <nav
        aria-label="Week navigation"
        className="mx-auto flex w-full max-w-[1400px] items-center justify-center gap-6 py-2"
      >
        <Link aria-label="Previous week" className={`${linkBase} h-11 w-11`} href={prevHref}>
          <IconChevronLeft size={22} />
        </Link>
        {!isCurrentWeek && (
          <Link
            aria-label="Jump to today"
            className={`${linkBase} h-11 px-4 text-sm font-medium`}
            href="/planner"
          >
            Today
          </Link>
        )}
        <Link aria-label="Next week" className={`${linkBase} h-11 w-11`} href={nextHref}>
          <IconChevronRight size={22} />
        </Link>
      </nav>
    );
  }

  return (
    <nav
      aria-label="Week navigation"
      className="flex items-center gap-3 text-sm text-[var(--tm-text)]"
    >
      <Link aria-label="Previous week" className={`${linkBase} h-8 w-8`} href={prevHref}>
        <IconChevronLeft size={16} />
      </Link>
      <span className="font-medium">Week of {formatWeekLabel(weekStartDate)}</span>
      {!isCurrentWeek && (
        <Link
          aria-label="Jump to today"
          className={`${linkBase} h-8 px-3 text-xs font-medium`}
          href="/planner"
        >
          Today
        </Link>
      )}
      <Link aria-label="Next week" className={`${linkBase} h-8 w-8`} href={nextHref}>
        <IconChevronRight size={16} />
      </Link>
    </nav>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

```
npx vitest run tests/components/week-navigator.test.tsx
```

Expected: all 5 tests pass.

- [ ] **Step 5: Commit**

```
git add src/components/planner/week-navigator.tsx tests/components/week-navigator.test.tsx
git commit -m "feat: add week navigator component"
```

---

## Task 3: Wire navigator into `WeeklySpread`

**Files:**
- Modify: `src/components/planner/weekly-spread.tsx`
- Test: `tests/components/weekly-spread.test.tsx`

- [ ] **Step 1: Extend the failing tests**

Replace the two existing `it(...)` blocks in `tests/components/weekly-spread.test.tsx` — keep the imports and the `afterEach` — with:

```tsx
  it("renders Saturday through Friday and Weekly Notes", () => {
    render(
      <WeeklySpread
        items={[]}
        weekStartDate="2026-05-16"
        currentWeekStartDate="2026-05-16"
        weeklyNote=""
      />,
    );

    expect(screen.getByText(/Saturday/i)).toBeInTheDocument();
    expect(screen.getByText(/Sunday/i)).toBeInTheDocument();
    expect(screen.getByText(/Monday/i)).toBeInTheDocument();
    expect(screen.getByText(/Tuesday/i)).toBeInTheDocument();
    expect(screen.getByText(/Wednesday/i)).toBeInTheDocument();
    expect(screen.getByText(/Thursday/i)).toBeInTheDocument();
    expect(screen.getByText(/Friday/i)).toBeInTheDocument();
    expect(screen.getByText(/Weekly Notes/i)).toBeInTheDocument();
  });

  it("renders the notebook spread shell", () => {
    render(
      <WeeklySpread
        items={[]}
        weekStartDate="2026-05-23"
        currentWeekStartDate="2026-05-23"
        weeklyNote=""
      />,
    );

    expect(screen.getByTestId("notebook-spread")).toBeInTheDocument();
    expect(screen.getByText("Saturday")).toBeInTheDocument();
    expect(screen.getByText("Weekly Notes")).toBeInTheDocument();
  });

  it("renders two week navigators (header + footer)", () => {
    render(
      <WeeklySpread
        items={[]}
        weekStartDate="2026-05-16"
        currentWeekStartDate="2026-05-16"
        weeklyNote=""
      />,
    );

    const navigators = screen.getAllByRole("navigation", { name: /week navigation/i });
    expect(navigators).toHaveLength(2);
  });

  it("navigator prev/next hrefs are anchored on the shown week", () => {
    render(
      <WeeklySpread
        items={[]}
        weekStartDate="2026-05-23"
        currentWeekStartDate="2026-05-16"
        weeklyNote=""
      />,
    );

    const prevLinks = screen.getAllByRole("link", { name: /previous week/i });
    const nextLinks = screen.getAllByRole("link", { name: /next week/i });

    expect(prevLinks[0]).toHaveAttribute("href", "/planner?week=2026-05-16");
    expect(nextLinks[0]).toHaveAttribute("href", "/planner?week=2026-05-30");
  });
```

- [ ] **Step 2: Run tests to verify they fail**

```
npx vitest run tests/components/weekly-spread.test.tsx
```

Expected: TypeScript / runtime failure on missing `currentWeekStartDate` prop; two new navigator tests fail.

- [ ] **Step 3: Modify `WeeklySpread` to accept the prop and render both navigators**

Edit `src/components/planner/weekly-spread.tsx`:

Add the import near the top:

```tsx
import { WeekNavigator } from "./week-navigator";
```

Extend the props type:

```tsx
type WeeklySpreadProps = {
  weekStartDate: string;
  currentWeekStartDate: string;
  items: WeeklySpreadItem[];
  weeklyNote: string;
};
```

Destructure the new prop:

```tsx
export function WeeklySpread({
  weekStartDate,
  currentWeekStartDate,
  items,
  weeklyNote,
}: WeeklySpreadProps) {
```

Replace the header block. Old:

```tsx
        <header className="flex flex-col gap-1">
          <p className="text-sm font-semibold text-[var(--tm-secondary)]">
            Weekly Spread
          </p>
          <h1 className="font-serif text-3xl font-semibold tracking-tight text-[var(--tm-text)]">
            Week of{" "}
            <time dateTime={weekStartDate}>
              {new Intl.DateTimeFormat("en", {
                day: "numeric",
                month: "long",
                timeZone: "UTC",
              }).format(new Date(`${weekStartDate}T00:00:00Z`))}
            </time>
          </h1>
        </header>
```

New:

```tsx
        <header className="flex flex-col gap-2">
          <p className="text-sm font-semibold text-[var(--tm-secondary)]">
            Weekly Spread
          </p>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="font-serif text-3xl font-semibold tracking-tight text-[var(--tm-text)]">
              Week of{" "}
              <time dateTime={weekStartDate}>
                {new Intl.DateTimeFormat("en", {
                  day: "numeric",
                  month: "long",
                  timeZone: "UTC",
                }).format(new Date(`${weekStartDate}T00:00:00Z`))}
              </time>
            </h1>
            <WeekNavigator
              currentWeekStartDate={currentWeekStartDate}
              variant="header"
              weekStartDate={weekStartDate}
            />
          </div>
        </header>
```

Add the footer navigator directly after the notebook grid `<div>` closes and before the outer `</div>` of the `max-w-[1400px]` wrapper. That is, right before the final `</div>` inside `<main>`:

```tsx
        <WeekNavigator
          currentWeekStartDate={currentWeekStartDate}
          variant="footer"
          weekStartDate={weekStartDate}
        />
```

- [ ] **Step 4: Run tests to verify they pass**

```
npx vitest run tests/components/weekly-spread.test.tsx tests/components/week-navigator.test.tsx
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```
git add src/components/planner/weekly-spread.tsx tests/components/weekly-spread.test.tsx
git commit -m "feat: render week navigator in weekly spread header and footer"
```

---

## Task 4: Wire the query param into `PlannerPage`

**Files:**
- Modify: `src/app/(app)/planner/page.tsx`

No new tests — this is pure glue between the helper (already tested), Supabase, and `WeeklySpread` (already tested). The full test/build sweep in Task 5 covers it.

- [ ] **Step 1: Update the page to accept `searchParams` and resolve the week**

Replace the entire body of `src/app/(app)/planner/page.tsx` with:

```tsx
import { Temporal } from "@js-temporal/polyfill";

import { WeeklySpread } from "@/components/planner/weekly-spread";
import type { WeeklySpreadItem } from "@/components/planner/weekly-spread";
import { requireInvitedUser } from "@/lib/auth/guard";
import {
  getSaturdayWeekStart,
  resolveWeekParam,
  todayInTimezone,
} from "@/lib/planner/dates";

export const dynamic = "force-dynamic";

function weekEndDate(weekStartDate: string) {
  return Temporal.PlainDate.from(weekStartDate).add({ days: 6 }).toString();
}

type PlannerPageProps = {
  searchParams: Promise<{ week?: string }>;
};

export default async function PlannerPage({ searchParams }: PlannerPageProps) {
  const { supabase, user } = await requireInvitedUser("/planner");

  const { data: profile } = await supabase
    .from("profiles")
    .select("timezone")
    .eq("id", user.id)
    .maybeSingle();

  const timezone = profile?.timezone || "Asia/Gaza";
  const today = todayInTimezone(timezone);
  const currentWeekStartDate = getSaturdayWeekStart(today);
  const { week } = await searchParams;
  const weekStartDate = resolveWeekParam(week, today);
  const weekEnd = weekEndDate(weekStartDate);

  const [{ data: plannerItems }, { data: weeklyNote }] = await Promise.all([
    supabase
      .from("planner_items")
      .select("id,title,item_date,item_time,block,status")
      .eq("user_id", user.id)
      .eq("bucket", "weekly_spread")
      .neq("status", "deleted")
      .gte("item_date", weekStartDate)
      .lte("item_date", weekEnd)
      .order("item_date", { ascending: true })
      .order("item_time", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true }),
    supabase
      .from("weekly_notes")
      .select("content")
      .eq("user_id", user.id)
      .eq("week_start_date", weekStartDate)
      .maybeSingle(),
  ]);

  return (
    <WeeklySpread
      currentWeekStartDate={currentWeekStartDate}
      items={(plannerItems ?? []) as WeeklySpreadItem[]}
      weekStartDate={weekStartDate}
      weeklyNote={weeklyNote?.content ?? ""}
    />
  );
}
```

- [ ] **Step 2: Commit**

```
git add src/app/(app)/planner/page.tsx
git commit -m "feat: read ?week param on planner page for week navigation"
```

---

## Task 5: Full verification

**Files:** none modified.

- [ ] **Step 1: Run the full unit test suite**

```
npm run test
```

Expected: all tests pass, no new failures.

- [ ] **Step 2: Run lint**

```
npm run lint
```

Expected: 0 errors, 0 warnings in the files touched (`dates.ts`, `week-navigator.tsx`, `weekly-spread.tsx`, `planner/page.tsx`, and their test files).

- [ ] **Step 3: Run the production build**

```
npm run build
```

Expected: build succeeds, no TypeScript errors.

- [ ] **Step 4: Manual smoke test**

Start the dev server if not already running (`npm run dev`), sign in, and open `/planner`:

- On current week: header shows "Week of <this Saturday>", no "Today" link visible; footer shows only chevrons.
- Click header chevron ›: URL becomes `/planner?week=<next Saturday>`. Header updates. "Today" link now appears in both nav bars.
- Click "Today" (from either variant): URL returns to `/planner` (no query). Current week renders.
- Manually visit `/planner?week=2026-08-19` (a Wednesday): renders the week of 2026-08-15 (snapped). No error.
- Manually visit `/planner?week=nonsense`: renders the current week. No error.

- [ ] **Step 5: No commit needed** — this task only verifies.
