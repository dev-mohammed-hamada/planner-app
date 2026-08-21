# Weekly Spread Navigator Design

**Date:** 2026-08-21
**Status:** Approved, ready for implementation plan

## Goal

Let the user browse past and upcoming weeks from `/planner` via prev/next controls, without leaving the notebook-spread view.

## Motivation

`/planner` currently pins the view to the current Saturday-anchored week — see `src/app/(app)/planner/page.tsx:24`. There is no way to look back at last week's completed items or preview next week's schedule from the web UI. A minimal navigator makes both directions reachable and is a prerequisite for any future week-picker or history feature.

## Non-Goals

- Keyboard shortcuts
- Animated page-turn transitions
- A month/week-picker dropdown
- Changing the week anchor (stays Saturday)
- Multi-week aggregation views

## Architecture

```
GET /planner?week=YYYY-MM-DD
        │
        ▼
PlannerPage (server component)
  │
  ├─ resolveWeekParam(searchParams.week, today) → weekStartDate
  │     - missing / invalid / non-Saturday → snap to today's Saturday
  │
  ├─ Supabase queries (planner_items, weekly_notes) — key off weekStartDate (unchanged)
  │
  └─ <WeeklySpread weekStartDate today ...>
         │
         ├─ header: <WeekNavigator variant="header">
         │            ‹  Week of Aug 15  · Today  ›
         │
         ├─ notebook grid (unchanged)
         │
         └─ footer: <WeekNavigator variant="footer">
                      ‹     ›   (compact chevrons only)
```

The URL query param is the single source of truth. Because the page is already `dynamic = "force-dynamic"` and server-rendered, prev/next links are plain `<Link>` navigations — no client state.

## Components

### 1. `resolveWeekParam(input, today, timezone)` — new helper in `src/lib/planner/dates.ts`

```ts
export function resolveWeekParam(
  input: string | undefined,
  today: string,
): string;
```

- If `input` is a valid ISO `PlainDate` → return `getSaturdayWeekStart(input)`. Snaps midweek inputs to the enclosing Saturday.
- If `input` is missing, malformed, or throws in `Temporal.PlainDate.from` → return `getSaturdayWeekStart(today)`.
- Pure function, no I/O. Fully unit-testable.

### 2. `WeekNavigator` — new server component

`src/components/planner/week-navigator.tsx`

```ts
type Variant = "header" | "footer";

type WeekNavigatorProps = {
  weekStartDate: string;
  currentWeekStartDate: string;
  variant: Variant;
};
```

Renders three `<Link>`s:

- **Prev** → `/planner?week=<weekStart − 7 days>`
- **Today** → `/planner` (query param dropped). Hidden entirely when `weekStartDate === currentWeekStartDate`.
- **Next** → `/planner?week=<weekStart + 7 days>`

Variant differences:

- `header`: chevrons + human-readable label (`"Week of Aug 15"`) + `Today` pill.
- `footer`: chevrons only, centered, larger tap targets. No label (header already shows it).

Uses existing `--tm-*` design tokens. No new colors.

### 3. `PlannerPage` — modified

`src/app/(app)/planner/page.tsx`

- Accept `searchParams: Promise<{ week?: string }>` (Next 16 requires awaiting `searchParams`).
- Compute `todaySaturday = getSaturdayWeekStart(todayInTimezone(timezone))`.
- Compute `weekStartDate = resolveWeekParam(await searchParams.week, todayInTimezone(timezone))`.
- Pass both `weekStartDate` and `currentWeekStartDate = todaySaturday` into `WeeklySpread`.

### 4. `WeeklySpread` — modified

`src/components/planner/weekly-spread.tsx`

- Accept new `currentWeekStartDate` prop.
- Render `<WeekNavigator variant="header" …>` inside the existing header block.
- Render `<WeekNavigator variant="footer" …>` below the notebook grid, inside the `max-w-[1400px]` wrapper.

## Data Flow

1. User clicks a chevron → browser navigates to `/planner?week=<iso>`.
2. Next re-runs `PlannerPage` on the server.
3. `resolveWeekParam` normalizes the input.
4. Supabase queries fetch that week's `planner_items` and `weekly_notes`.
5. Full re-render of `WeeklySpread` with the new week.

No client-side state, no optimistic UI. Simple and correct.

## Error Handling

- Invalid `week` (garbage, non-Saturday, non-ISO) → normalize silently to the enclosing Saturday or to today's Saturday if unparseable. Never 404, never throw.
- URL is not corrected via redirect; the rendered content is authoritative.

## Testing

- **Unit (Vitest)** — `resolveWeekParam`:
  - valid Saturday input → passthrough
  - midweek input → snapped to enclosing Saturday
  - `undefined` → today's Saturday
  - garbage string (`"foo"`) → today's Saturday
  - malformed ISO (`"2026-99-99"`) → today's Saturday
- **Unit (Vitest)** — `WeekNavigator`:
  - renders prev/next hrefs with expected ISO dates
  - hides "Today" link when on current week
  - shows "Today" link when off current week
  - `footer` variant omits the label
- **No new e2e.** Existing planner e2e continues to pass because default behavior (no query param) is unchanged.

## Rollout

Single PR. No feature flag — the current-week default preserves existing behavior for any bookmarked `/planner` link.
