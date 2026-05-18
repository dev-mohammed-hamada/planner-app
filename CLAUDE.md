# Planner App — Agent Guide

A single-user weekly planner. Next.js 16 App Router + React 19 + Supabase (auth, RLS, Postgres). Capture is via a Telegram bot; the web UI displays and edits.

## Tech

- Next.js 16 (App Router, Server Actions, Turbopack)
- React 19, Tailwind CSS 4, Tabler Icons
- Supabase: `@supabase/ssr` server client, magic-link auth, RLS per-user
- `@js-temporal/polyfill` for all date math — never use `Date` for date logic
- Zod for runtime validation
- Vitest + Testing Library for unit; Playwright for e2e (`tests/e2e/`)

## Conventions

- Use the `@/` import alias for `src/`.
- Server actions live next to their page: `src/app/(app)/<route>/actions.ts`.
- All protected pages use `requireInvitedUser("/route-path")` from [src/lib/auth/guard.ts](src/lib/auth/guard.ts) — do not call `supabase.auth.getUser()` directly in pages.
- Service-role Supabase client (`createClient({ useServiceRole: true })`) is for invite checks and webhook writes only. Never use it in client components or unprotected paths.
- Tests must not hit real services. Mock Supabase, Telegram, Anthropic.
- New code: no emojis, no trailing commit summaries, no defensive comments. See repo-level guidance.

## Auth model

- Magic-link only. Invite-gated by `auth_invites` table (email allowlist, optional expiry).
- Sign-in flow: `/auth/login` → magic link → `/auth/callback` → guard verifies invite → land at `next`.
- Sign-out: settings page → [logout-action.ts](src/app/(app)/settings/logout-action.ts).

## Planner model

`planner_items` columns the parser must produce:
- `title`, `original_text`
- `item_type`: `task` | `appointment` | `note`
- `item_date`: ISO date `YYYY-MM-DD` or null
- `item_time`: `HH:MM` 24h or null
- `block`: `morning` | `afternoon` | `evening` | `unsorted` | `none`
- `bucket`: `weekly_spread` | `inbox` | `future_notes`
- `source`: `telegram` (only source currently)

Routing rules used by [capture-parser.ts](src/lib/planner/capture-parser.ts):
- Vague future ("someday/eventually/next month") → `future_notes`
- Has parsed date → `weekly_spread`
- Otherwise → `inbox`

`/planner` shows `weekly_spread` items for the current Saturday-anchored week. `/inbox` shows undated items. The AI-augmented parser (see [docs/superpowers/specs/2026-05-18-ai-capture-parser-design.md](docs/superpowers/specs/2026-05-18-ai-capture-parser-design.md)) escalates ambiguous and multi-item messages to Claude Haiku.

## Telegram capture

- Webhook: [src/app/api/telegram/webhook/route.ts](src/app/api/telegram/webhook/route.ts)
- Linking: 6-digit code generated on `/settings`, hashed in DB. User DMs the code to the bot to complete linking.
- Webhook secret is verified via `x-telegram-bot-api-secret-token` header.

## Env vars

Required (in `.env`):
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`
- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`
- `APP_URL`
- `ANTHROPIC_API_KEY` (optional — disables AI parser escalation if absent)

Optional:
- `CRON_SECRET` (production cron reminders)
- `NEXT_PUBLIC_SITE_URL` (overrides host detection in [redirects.ts](src/lib/auth/redirects.ts))

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Next.js dev server on :3000 |
| `npm run lint` | ESLint over project (ignores `.next/**`) |
| `npm run test` | Vitest, excludes `tests/e2e/` and `.claude/` |
| `npm run build` | Production build (also runs `tsc`) |
| `npm run e2e` | Playwright — requires dev server reachable |

## Process & tools

- Migrations are append-only files in `supabase/migrations/`. Number sequentially.
- For UI changes, run the dev server and exercise the feature before claiming done.
- Don't add helpers, abstractions, or fallbacks the task doesn't require.
- When debugging, query Supabase directly with the service-role key before instrumenting code.
- Specs and plans live in `docs/superpowers/`. Existing ones are good prior art for new ones.

## Pitfalls

- The `.claude/worktrees/` path holds harness-managed worktrees. **Do not** remove them; the harness owns cleanup.
- ESLint can wander into nested `.next/build/` when run from the project root with a worktree present — known config gap, not a real lint failure.
- Vitest globs need `**/tests/e2e/**` (not `tests/e2e/**`) so nested worktree specs are excluded.
