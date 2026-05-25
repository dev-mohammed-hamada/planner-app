# Full Platform Redesign Design

Date: 2026-05-25

## Purpose

Redesign the planner from a small weekly planning app into a broader personal planning platform with a cohesive design system, richer top-level navigation, a global quick-add workflow, notes, settings-backed preferences, and calendar-facing surfaces.

The app should still feel calm and useful for daily planning. The redesign should not turn the product into a noisy productivity dashboard. It should preserve the existing capture reliability while giving the interface a stronger product shape.

## Chosen Approach

Use the full planning platform expansion direction.

The redesigned app has four top-level areas:

- Week
- Calendar
- Notes
- Settings

It also has a global Quick add action available from every protected route.

The implementation should be staged, but the design target is one platform. The stages are:

1. Shared design system and app shell.
2. Redesigned planner surfaces: Week, Calendar day view, Notes, Settings, and Quick add.
3. Schema-backed platform features for preferences, reminders, calendar connection state, and richer notes.

## Product Shape

### Week

Week remains the home screen and the emotional center of the product. It shows the current Saturday-anchored week as a notebook-style spread with seven day sections and a notes panel.

Week supports:

- Saturday-to-Friday planning.
- Today highlight.
- Timed and untimed planner items.
- Completion, editing, moving, and deleting existing planner items.
- Weekly notes shown as part of the notebook surface.

### Calendar

Calendar starts with a focused day view backed by existing `planner_items`.

Calendar supports:

- A day header with the selected date.
- Previous and next day navigation.
- Rows for timed items and untimed items.
- Completion, editing, and deleting planner items.
- Empty ruled rows when a day has few items.
- Calendar connection status and preferences.

Imported provider events are not part of this first implementation stage. Calendar sync begins as connection state and preferences. OAuth, token storage, provider permissions, and event ingestion need a separate integration design before implementation.

### Notes

Notes replaces the old Inbox mental model with a clearer information architecture.

Notes supports:

- Future notes from existing `planner_items.bucket = "future_notes"`.
- Unsorted captures from existing `planner_items.bucket = "inbox"`.
- Weekly note archive from `weekly_notes`.
- New note collections and notes for richer non-task content.

The first redesigned Notes experience should surface existing data safely, then layer in the new `note_collections` and `notes` tables.

### Settings

Settings becomes a dense operational area for account and platform state.

Settings supports:

- Telegram linking.
- Reminder preferences.
- Calendar connection state.
- Display preferences.
- Account actions, including sign out.

Settings should use compact sections, rows, toggles, and icon buttons instead of large explanatory cards.

### Quick Add

Quick add becomes a global modal rather than an inline planner form.

Quick add supports:

- Natural-language capture text.
- Parsed token preview for date, time, block, bucket, and item type.
- Manual overrides before save.
- Pending, success, and validation-error states.
- Server-side validation and persistence through the existing capture pipeline.

The existing parser and AI escalation remain the backbone. If AI parsing is unavailable or fails, the regex fallback still saves the capture.

## Visual System

The visual direction is hybrid.

Planning surfaces use an elevated notebook language:

- Warm desk and paper surfaces.
- Soft shadows.
- Ruled lines.
- Serif day headings on notebook sections.
- Blue highlights for today, time, and parsed scheduling cues.

Operational surfaces use the sharper design-system language from the reference files:

- Crisp white and pale surfaces.
- Manrope headings.
- Inter body text.
- JetBrains Mono labels, metadata, dates, and times.
- Black primary actions.
- Blue secondary/time accents.
- Green success states.
- Dense rows and compact controls.

The notebook treatment is reserved for the Week canvas and planner-note panels. Navigation, modals, forms, Calendar, Notes management, and Settings use the operational system so the app remains consistent and efficient.

The UI should avoid:

- Marketing-style hero sections.
- Decorative gradient/orb backgrounds.
- Oversized cards for simple settings.
- Rounded text pills where an icon, toggle, or familiar control is clearer.
- A one-color palette.

## Shared Components

Introduce shared components only where they create consistency across the redesign.

Core shared components:

- `AppShell`: desktop top nav, mobile bottom nav, active route state, global Quick add launcher.
- `QuickAddModal`: modal shell, text input, parsed token preview, manual overrides, actions, feedback.
- `Button`: primary, secondary, quiet, icon-only, destructive.
- `TextField`, `TextareaField`, `SelectField`: consistent labels, validation, focus states.
- `Toggle`: settings and preference rows.
- `Section`: settings and notes grouping with consistent heading and border rules.
- `DataRow`: dense operational rows for settings, notes, and calendar lists.
- `NotebookSpread`: Week-specific notebook canvas.
- `RuledPlannerList`: day-view and notebook-list row rendering.

These components should live under `src/components/` with route-specific composition in route pages and server actions near their pages.

## Routes

All protected routes must use `requireInvitedUser("/route")` from `src/lib/auth/guard.ts`.

Route plan:

- `/planner`: Week notebook.
- `/calendar`: Calendar day view.
- `/notes`: Notes, future notes, unsorted captures, weekly archive, and note collections.
- `/settings`: Integrations, preferences, reminders, display, account.
- `/auth/login`: Redesigned login surface using the same visual tokens but no protected app shell.

The root route should continue to redirect allowed users to `/planner`.

## Data Model

Existing tables remain valid:

- `planner_items`
- `weekly_notes`
- `profiles`
- `telegram_links`
- `auth_invites`

New migrations are append-only.

### User Preferences

`user_preferences` stores display and product preferences.

Fields:

- `id`
- `user_id`
- `theme`: `light` | `dark` | `system`
- `default_calendar_view`: `day`
- `quick_add_default_bucket`: `weekly_spread` | `inbox` | `future_notes`
- `created_at`
- `updated_at`

### Reminder Preferences

`reminder_preferences` stores user-editable reminder settings.

Fields:

- `id`
- `user_id`
- `reminder_type`: `evening_planning` | `morning_check_in` | `weekly_reset`
- `enabled`
- `local_time`
- `day_of_week`
- `created_at`
- `updated_at`

Existing reminder delivery logic can read these settings once the preferences are implemented.

### Calendar Connections

`calendar_connections` stores calendar connection state without implementing provider OAuth in this phase.

Fields:

- `id`
- `user_id`
- `provider`: `google`
- `status`: `not_connected` | `connected` | `error` | `revoked`
- `provider_account_email`
- `last_synced_at`
- `created_at`
- `updated_at`

OAuth tokens and imported event storage are intentionally excluded from this redesign spec.

### Note Collections

`note_collections` groups richer notes.

Fields:

- `id`
- `user_id`
- `name`
- `sort_order`
- `created_at`
- `updated_at`

### Notes

`notes` stores editable note content that is not a planner item.

Fields:

- `id`
- `user_id`
- `collection_id`
- `title`
- `content`
- `status`: `active` | `archived` | `deleted`
- `created_at`
- `updated_at`

## Actions And Data Flow

Server actions stay next to their pages.

Expected action files:

- `src/app/(app)/planner/actions.ts`
- `src/app/(app)/calendar/actions.ts`
- `src/app/(app)/notes/actions.ts`
- `src/app/(app)/settings/actions.ts`

Quick add should call a shared server action that validates input, applies manual overrides, runs the existing capture path, and revalidates affected routes.

The existing capture flow remains:

1. User submits natural-language text.
2. Regex parser produces a first result.
3. AI parser escalates when needed and available.
4. Manual overrides are applied.
5. Validated items are saved.
6. Week, Calendar, and Notes surfaces revalidate.

Tests must mock Supabase, Telegram, and OpenAI.

## Error Handling

The system should fail gently and preserve captures.

- If Quick add validation fails, show an inline error and keep the typed text.
- If AI parsing fails or is unavailable, save the regex fallback.
- If manual override values are invalid, reject them server-side with a clear message.
- If there are no items for a day, show empty ruled rows rather than a blank void.
- If there are no notes, show a calm empty state with a clear action.
- If Telegram is not linked, Settings shows the link-code flow.
- If calendar is not connected, Calendar and Settings show connection state without pretending sync exists.
- If a new preferences row is missing, the UI uses safe defaults and can create the row on update.

## Testing

Unit and component tests should cover:

- App shell active navigation.
- Mobile bottom navigation rendering.
- Quick add modal pending, success, validation-error, and fallback states.
- Manual override validation.
- Day view item grouping and empty rows.
- Notes route rendering for future notes, inbox items, weekly archive, and note collections.
- Settings toggles and preference actions.
- New repository helpers for preferences, notes, reminders, and calendar connection state.

Playwright should cover:

- Login redirect still lands allowed users on `/planner`.
- Global navigation between Week, Calendar, Notes, and Settings.
- Opening Quick add from the app shell.
- Creating an item and seeing it on Week and Calendar.
- Notes empty and populated states.
- Settings empty states and preference toggles.

For UI work, run the dev server and verify the main flows in the browser on desktop and mobile widths before claiming completion.

## Implementation Notes

- Use `@/` imports for `src/`.
- Keep `@js-temporal/polyfill` for date logic.
- Do not call `supabase.auth.getUser()` directly in protected pages.
- Do not use the service-role Supabase client in client components or unprotected paths.
- Keep migrations append-only and sequential.
- Avoid adding broad abstractions before the shared design-system components have repeated use.
- Preserve user changes in the current dirty worktree.

## Open Non-Goals For This Phase

These are intentionally outside the first redesign implementation:

- Google OAuth authorization.
- Calendar event ingestion.
- Two-way calendar sync.
- Rich text editing.
- Multi-user sharing.
- Native mobile app behavior.

