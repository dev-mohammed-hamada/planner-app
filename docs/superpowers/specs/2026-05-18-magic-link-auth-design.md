# Magic Link Authentication Design

Date: 2026-05-18

## Purpose

Add a private authentication system so the planner can safely run as a hosted app. The app should remain calm and low-friction while ensuring each user can only access their own planner data, Telegram link, reminder settings, inbox, and future notes.

The first auth version should be production-ready for a small private launch, not a full public SaaS account system.

## Chosen Approach

Use Supabase magic link authentication with a database-backed invite allowlist.

This approach is preferred because:

- The existing schema already references `auth.users` and uses Supabase RLS through `auth.uid()`.
- The protected pages already expect `supabase.auth.getUser()`.
- Magic links avoid password management and password reset flows.
- Database invites are easier to expand later than an environment-variable allowlist.
- A neutral login response avoids revealing which emails are invited.

## Access Model

- Authentication method: Supabase magic link only.
- Signup model: private and invite-only.
- Invite storage: `auth_invites` table.
- Invites support active/inactive state.
- Invites support optional expiry through `expires_at`.
- The owner invite never expires by using `expires_at = null`.
- The first owner invite is created through documented setup SQL, not hardcoded in a migration.
- Uninvited emails receive the same neutral UI response as invited emails.

## Invite Rules

An email can receive a magic link only when:

- The normalized email matches a row in `auth_invites`.
- The invite is active.
- `expires_at` is null or later than the current time.

Email normalization should trim whitespace and lowercase the address before lookup.

## Login Flow

1. A user visits `/auth/login` directly or is redirected there from a protected page.
2. Protected redirects include `next`, such as `/auth/login?next=/settings`.
3. The login page shows a single email field and one primary action: `Send sign-in link`.
4. The server validates that the submitted value is shaped like an email.
5. The server normalizes the email.
6. The server checks `auth_invites`.
7. If the invite is valid, the server calls Supabase magic link sign-in.
8. If the invite is invalid, the server does not call Supabase.
9. In both cases, the UI shows a neutral message: `If this email has access, we sent a sign-in link.`
10. The magic link redirects to `/auth/callback?next=<encoded destination>`.
11. The callback exchanges the Supabase auth code/session.
12. The callback redirects to the original `next` path or `/planner`.

## Protected App Guard

Protected app pages include:

- `/planner`
- `/inbox`
- `/settings`
- future pages under the authenticated app area

For protected pages:

- If there is no Supabase session, redirect to `/auth/login?next=<current path>`.
- If there is a session, verify that the user's email still has a valid active invite.
- If the invite is inactive or expired, sign the user out and redirect to `/auth/login`.
- Existing server actions continue to call `supabase.auth.getUser()` before mutating data.
- RLS remains the primary data boundary for user-owned rows.

Telegram webhook and cron routes continue using the service-role Supabase client because they run outside browser sessions.

## Auth Pages And UI

### `/auth/login`

- Quiet Productivity visual style.
- One email input.
- One primary button: `Send sign-in link`.
- Neutral success message after submit.
- Validation messages only for malformed email and temporary system errors.
- Preserves `next` from the query string.

### `/auth/callback`

- Handles Supabase magic link callback.
- Exchanges the auth code/session.
- Redirects to `next` or `/planner`.
- Redirects back to login with a generic error if callback fails.

### Logout

- Provide a server action for signing out.
- Add the first logout control in Settings.
- Redirect to `/auth/login` after logout.

### Root Page

- `/` redirects signed-in users to `/planner`.
- `/` redirects signed-out users to `/auth/login`.

## Database Additions

Add `public.auth_invites`:

- `id uuid primary key default gen_random_uuid()`
- `email text not null unique`
- `active boolean not null default true`
- `expires_at timestamptz`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

The table should use the existing `set_updated_at()` trigger pattern.

The app should not expose invite management UI in this version. Owner setup is documented with SQL similar to:

```sql
insert into public.auth_invites (email, active, expires_at)
values ('you@example.com', true, null)
on conflict (email) do update
set active = excluded.active,
    expires_at = excluded.expires_at;
```

## Implementation Scope

Included in this auth version:

- `auth_invites` database table.
- invite lookup helper.
- documented setup SQL for the first owner invite.
- `/auth/login`.
- `/auth/callback`.
- logout action.
- root redirect.
- shared protected guard helper.
- existing protected pages updated to preserve `next`.
- tests for invite checking, login action behavior, callback redirect behavior, and protected guard behavior.
- README notes for Supabase magic link setup and owner invite setup.

Out of scope:

- Admin invite management UI.
- Google login.
- password login.
- password reset.
- request-access page.
- billing, teams, workspace roles, or organization accounts.
- Telegram behavior changes beyond requiring a logged-in web account before linking Telegram.

## Success Criteria

- Invited users can request a magic link and enter the app.
- Uninvited users do not receive a magic link from the app flow.
- Invited and uninvited email submissions show the same neutral message.
- Protected pages redirect logged-out users to login with a `next` destination.
- Magic link callback returns users to the intended page.
- Deactivated or expired invited users are not allowed into protected app pages.
- Existing RLS boundaries remain unchanged and continue protecting user data.
- Existing Telegram webhook and reminder cron behavior still work.
