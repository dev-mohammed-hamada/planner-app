# Magic Link Authentication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add private Supabase magic-link authentication with database invites, protected app guards, and a quiet login experience.

**Architecture:** Supabase Auth remains the session provider and existing RLS remains the user-data boundary. A new `auth_invites` table controls who can receive magic links, and server-only invite reads use the existing Supabase service-role client so invite rows are not exposed through public RLS policies. Shared auth helpers keep invite checks, redirects, and `next` handling consistent across pages, actions, and callback routes.

**Tech Stack:** Next.js App Router, Supabase SSR client, Supabase Auth magic links, PostgreSQL migrations, Vitest, Testing Library, Playwright.

---

## Context And References

- Design spec: `docs/superpowers/specs/2026-05-18-magic-link-auth-design.md`
- Existing Supabase client: `src/lib/supabase/server.ts`
- Existing protected pages:
  - `src/app/(app)/planner/page.tsx`
  - `src/app/(app)/inbox/page.tsx`
  - `src/app/(app)/settings/page.tsx`
- Existing settings action style: `src/app/(app)/settings/actions.ts`
- Existing schema migration: `supabase/migrations/0001_initial_planner_schema.sql`
- Existing E2E smoke test: `tests/e2e/planner.spec.ts`

There are unrelated uncommitted Task 10 files in this repo. When committing auth tasks, stage only the files named in each task.

## File Structure

- `supabase/migrations/0002_auth_invites.sql`: creates the invite table and updated-at trigger.
- `supabase/setup-owner-invite.sql.example`: documented SQL for the first owner invite.
- `src/lib/auth/invites.ts`: email normalization and invite validity lookup.
- `src/lib/auth/redirects.ts`: `next` path sanitization and app origin resolution.
- `src/lib/auth/guard.ts`: shared protected-page user guard.
- `src/app/auth/login/actions.ts`: server action and pure helper for requesting magic links.
- `src/components/auth/magic-link-login-form.tsx`: client form for login page.
- `src/app/auth/login/page.tsx`: quiet login screen.
- `src/app/auth/callback/route.ts`: magic-link callback route.
- `src/app/(app)/settings/logout-action.ts`: sign-out action.
- Existing app pages: replace repeated `getUser()` checks with the shared guard.
- `README.md`: add auth setup notes.
- Tests under `tests/auth/`.

## Task 1: Add Auth Invite Database Table

**Files:**
- Create: `supabase/migrations/0002_auth_invites.sql`
- Create: `supabase/setup-owner-invite.sql.example`

- [ ] **Step 1: Create invite migration**

Create `supabase/migrations/0002_auth_invites.sql`:

```sql
create table public.auth_invites (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  active boolean not null default true,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger auth_invites_set_updated_at
  before update on public.auth_invites
  for each row execute function public.set_updated_at();

alter table public.auth_invites enable row level security;
```

- [ ] **Step 2: Add owner invite setup SQL**

Create `supabase/setup-owner-invite.sql.example`:

```sql
-- Replace this email with the first owner email before running in Supabase SQL editor.
insert into public.auth_invites (email, active, expires_at)
values ('you@example.com', true, null)
on conflict (email) do update
set active = excluded.active,
    expires_at = excluded.expires_at;
```

- [ ] **Step 3: Verify migration text**

Run:

```bash
rg -n "auth_invites|setup-owner" supabase
```

Expected: output includes `0002_auth_invites.sql` and `setup-owner-invite.sql.example`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0002_auth_invites.sql supabase/setup-owner-invite.sql.example
git commit -m "feat: add auth invite schema"
```

## Task 2: Add Invite Lookup Helpers

**Files:**
- Create: `src/lib/auth/invites.ts`
- Create: `tests/auth/invites.test.ts`

- [ ] **Step 1: Write failing invite helper tests**

Create `tests/auth/invites.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";

import { isEmailInvited, normalizeEmail } from "@/lib/auth/invites";

describe("normalizeEmail", () => {
  it("trims whitespace and lowercases email addresses", () => {
    expect(normalizeEmail("  USER@Example.COM ")).toBe("user@example.com");
  });
});

describe("isEmailInvited", () => {
  it("returns true for active non-expired invites", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: { active: true, expires_at: null },
      error: null,
    });
    const eq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq }));
    const supabase = { from: vi.fn(() => ({ select })) };

    await expect(isEmailInvited(supabase as never, " USER@Example.COM ")).resolves.toBe(true);

    expect(supabase.from).toHaveBeenCalledWith("auth_invites");
    expect(eq).toHaveBeenCalledWith("email", "user@example.com");
  });

  it("returns false when no invite exists", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const eq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq }));
    const supabase = { from: vi.fn(() => ({ select })) };

    await expect(isEmailInvited(supabase as never, "nobody@example.com")).resolves.toBe(false);
  });

  it("returns false for inactive invites", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: { active: false, expires_at: null },
      error: null,
    });
    const eq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq }));
    const supabase = { from: vi.fn(() => ({ select })) };

    await expect(isEmailInvited(supabase as never, "user@example.com")).resolves.toBe(false);
  });

  it("returns false for expired invites", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: { active: true, expires_at: "2026-01-01T00:00:00.000Z" },
      error: null,
    });
    const eq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq }));
    const supabase = { from: vi.fn(() => ({ select })) };

    await expect(
      isEmailInvited(supabase as never, "user@example.com", new Date("2026-05-18T12:00:00.000Z")),
    ).resolves.toBe(false);
  });

  it("throws database errors", async () => {
    const error = new Error("database unavailable");
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error });
    const eq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq }));
    const supabase = { from: vi.fn(() => ({ select })) };

    await expect(isEmailInvited(supabase as never, "user@example.com")).rejects.toThrow(error);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
npm run test -- tests/auth/invites.test.ts
```

Expected: FAIL because `src/lib/auth/invites.ts` does not exist.

- [ ] **Step 3: Implement invite helpers**

Create `src/lib/auth/invites.ts`:

```ts
import type { SupabaseClient } from "@supabase/supabase-js";

type AuthInvite = {
  active: boolean;
  expires_at: string | null;
};

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function isEmailInvited(
  supabase: SupabaseClient,
  email: string,
  now = new Date(),
) {
  const normalizedEmail = normalizeEmail(email);

  const { data, error } = await supabase
    .from("auth_invites")
    .select("active,expires_at")
    .eq("email", normalizedEmail)
    .maybeSingle<AuthInvite>();

  if (error) {
    throw error;
  }

  if (!data?.active) {
    return false;
  }

  if (!data.expires_at) {
    return true;
  }

  return Date.parse(data.expires_at) > now.getTime();
}
```

- [ ] **Step 4: Run invite helper tests**

Run:

```bash
npm run test -- tests/auth/invites.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth/invites.ts tests/auth/invites.test.ts
git commit -m "feat: add auth invite checks"
```

## Task 3: Add Redirect Helpers And Magic Link Action

**Files:**
- Create: `src/lib/auth/redirects.ts`
- Create: `src/app/auth/login/actions.ts`
- Create: `tests/auth/login-actions.test.ts`

- [ ] **Step 1: Write failing tests for redirect and login behavior**

Create `tests/auth/login-actions.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";

import { sanitizeNextPath } from "@/lib/auth/redirects";
import { requestMagicLinkForEmail } from "@/app/auth/login/actions";

describe("sanitizeNextPath", () => {
  it("keeps safe app paths", () => {
    expect(sanitizeNextPath("/settings")).toBe("/settings");
  });

  it("falls back for absolute URLs", () => {
    expect(sanitizeNextPath("https://example.com/settings")).toBe("/planner");
  });

  it("falls back for protocol-relative URLs", () => {
    expect(sanitizeNextPath("//example.com/settings")).toBe("/planner");
  });

  it("falls back for auth paths", () => {
    expect(sanitizeNextPath("/auth/login")).toBe("/planner");
  });
});

describe("requestMagicLinkForEmail", () => {
  it("sends a Supabase magic link for invited emails", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: { active: true, expires_at: null },
      error: null,
    });
    const eq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq }));
    const signInWithOtp = vi.fn().mockResolvedValue({ error: null });
    const authSupabase = {
      auth: { signInWithOtp },
    };
    const inviteSupabase = {
      from: vi.fn(() => ({ select })),
    };

    await expect(
      requestMagicLinkForEmail(authSupabase as never, inviteSupabase as never, {
        email: " USER@Example.COM ",
        next: "/settings",
        origin: "https://planner.example.com",
      }),
    ).resolves.toEqual({ status: "sent" });

    expect(signInWithOtp).toHaveBeenCalledWith({
      email: "user@example.com",
      options: {
        emailRedirectTo: "https://planner.example.com/auth/callback?next=%2Fsettings",
      },
    });
  });

  it("does not send a Supabase magic link for uninvited emails", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const eq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq }));
    const signInWithOtp = vi.fn();
    const authSupabase = {
      auth: { signInWithOtp },
    };
    const inviteSupabase = {
      from: vi.fn(() => ({ select })),
    };

    await expect(
      requestMagicLinkForEmail(authSupabase as never, inviteSupabase as never, {
        email: "person@example.com",
        next: "/planner",
        origin: "https://planner.example.com",
      }),
    ).resolves.toEqual({ status: "not_invited" });

    expect(signInWithOtp).not.toHaveBeenCalled();
  });

  it("returns invalid_email without checking invites", async () => {
    const authSupabase = {
      auth: { signInWithOtp: vi.fn() },
    };
    const inviteSupabase = {
      from: vi.fn(),
    };

    await expect(
      requestMagicLinkForEmail(authSupabase as never, inviteSupabase as never, {
        email: "not-an-email",
        next: "/planner",
        origin: "https://planner.example.com",
      }),
    ).resolves.toEqual({ status: "invalid_email" });

    expect(inviteSupabase.from).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
npm run test -- tests/auth/login-actions.test.ts
```

Expected: FAIL because `src/lib/auth/redirects.ts` and `src/app/auth/login/actions.ts` do not exist.

- [ ] **Step 3: Implement redirect helpers**

Create `src/lib/auth/redirects.ts`:

```ts
export const DEFAULT_AUTH_REDIRECT = "/planner";

export function sanitizeNextPath(value: string | null | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return DEFAULT_AUTH_REDIRECT;
  }

  if (value.startsWith("/auth")) {
    return DEFAULT_AUTH_REDIRECT;
  }

  return value;
}

export function loginPathFor(nextPath: string) {
  return `/auth/login?next=${encodeURIComponent(sanitizeNextPath(nextPath))}`;
}

export function appOriginFromHeaders(host: string | null, proto: string | null) {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  }

  const safeHost = host ?? "localhost:3000";
  const safeProto = proto ?? "http";

  return `${safeProto}://${safeHost}`;
}
```

- [ ] **Step 4: Implement magic link action**

Create `src/app/auth/login/actions.ts`:

```ts
"use server";

import { headers } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";

import { isEmailInvited, normalizeEmail } from "@/lib/auth/invites";
import { appOriginFromHeaders, sanitizeNextPath } from "@/lib/auth/redirects";
import { createClient } from "@/lib/supabase/server";

export type MagicLinkActionState = {
  message?: string;
  error?: string;
};

type RequestMagicLinkInput = {
  email: string;
  next: string;
  origin: string;
};

const neutralMessage = "If this email has access, we sent a sign-in link.";

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function requestMagicLinkForEmail(
  authSupabase: SupabaseClient,
  inviteSupabase: SupabaseClient,
  input: RequestMagicLinkInput,
) {
  const email = normalizeEmail(input.email);

  if (!isValidEmail(email)) {
    return { status: "invalid_email" as const };
  }

  const invited = await isEmailInvited(inviteSupabase, email);

  if (!invited) {
    return { status: "not_invited" as const };
  }

  const nextPath = sanitizeNextPath(input.next);
  const emailRedirectTo = `${input.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`;
  const { error } = await authSupabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo },
  });

  if (error) {
    throw error;
  }

  return { status: "sent" as const };
}

export async function requestMagicLinkAction(
  previousState: MagicLinkActionState,
  formData: FormData,
): Promise<MagicLinkActionState> {
  void previousState;

  const email = String(formData.get("email") ?? "");
  const next = String(formData.get("next") ?? "/planner");

  const authSupabase = await createClient();
  const inviteSupabase = await createClient({ useServiceRole: true });
  const headerStore = await headers();
  const origin = appOriginFromHeaders(
    headerStore.get("host"),
    headerStore.get("x-forwarded-proto"),
  );

  try {
    const result = await requestMagicLinkForEmail(authSupabase, inviteSupabase, {
      email,
      next,
      origin,
    });

    if (result.status === "invalid_email") {
      return { error: "Enter a valid email address." };
    }

    return { message: neutralMessage };
  } catch (error) {
    console.error("Could not send magic link", error);

    return { error: "Could not send sign-in link. Please try again." };
  }
}
```

- [ ] **Step 5: Run login action tests**

Run:

```bash
npm run test -- tests/auth/login-actions.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/auth/redirects.ts src/app/auth/login/actions.ts tests/auth/login-actions.test.ts
git commit -m "feat: add magic link login action"
```

## Task 4: Add Login Page And Callback Route

**Files:**
- Create: `src/components/auth/magic-link-login-form.tsx`
- Create: `src/app/auth/login/page.tsx`
- Create: `src/app/auth/callback/route.ts`
- Create: `tests/auth/callback.test.ts`

- [ ] **Step 1: Write failing callback tests**

Create `tests/auth/callback.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";

import { handleAuthCallback } from "@/app/auth/callback/route";

describe("handleAuthCallback", () => {
  it("exchanges the auth code and redirects to a safe next path", async () => {
    const exchangeCodeForSession = vi.fn().mockResolvedValue({ error: null });
    const getUser = vi.fn().mockResolvedValue({
      data: { user: { email: "user@example.com" } },
      error: null,
    });
    const maybeSingle = vi.fn().mockResolvedValue({
      data: { active: true, expires_at: null },
      error: null,
    });
    const eq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq }));
    const signOut = vi.fn();
    const authSupabase = {
      auth: { exchangeCodeForSession, getUser, signOut },
    };
    const inviteSupabase = {
      from: vi.fn(() => ({ select })),
    };

    const redirectUrl = await handleAuthCallback(
      authSupabase as never,
      inviteSupabase as never,
      new URL("https://planner.example.com/auth/callback?code=abc&next=%2Fsettings"),
    );

    expect(exchangeCodeForSession).toHaveBeenCalledWith("abc");
    expect(redirectUrl).toBe("https://planner.example.com/settings");
    expect(signOut).not.toHaveBeenCalled();
  });

  it("redirects to login when code exchange fails", async () => {
    const authSupabase = {
      auth: {
        exchangeCodeForSession: vi.fn().mockResolvedValue({ error: new Error("bad code") }),
        getUser: vi.fn(),
        signOut: vi.fn(),
      },
    };
    const inviteSupabase = {
      from: vi.fn(),
    };

    const redirectUrl = await handleAuthCallback(
      authSupabase as never,
      inviteSupabase as never,
      new URL("https://planner.example.com/auth/callback?code=abc&next=%2Fsettings"),
    );

    expect(redirectUrl).toBe("https://planner.example.com/auth/login?error=callback");
  });

  it("signs out and redirects to login when the invite is inactive", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: { active: false, expires_at: null },
      error: null,
    });
    const eq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq }));
    const signOut = vi.fn().mockResolvedValue({ error: null });
    const authSupabase = {
      auth: {
        exchangeCodeForSession: vi.fn().mockResolvedValue({ error: null }),
        getUser: vi.fn().mockResolvedValue({
          data: { user: { email: "user@example.com" } },
          error: null,
        }),
        signOut,
      },
    };
    const inviteSupabase = {
      from: vi.fn(() => ({ select })),
    };

    const redirectUrl = await handleAuthCallback(
      authSupabase as never,
      inviteSupabase as never,
      new URL("https://planner.example.com/auth/callback?code=abc&next=%2Fsettings"),
    );

    expect(signOut).toHaveBeenCalled();
    expect(redirectUrl).toBe("https://planner.example.com/auth/login?error=access");
  });
});
```

- [ ] **Step 2: Run callback tests to verify they fail**

Run:

```bash
npm run test -- tests/auth/callback.test.ts
```

Expected: FAIL because `src/app/auth/callback/route.ts` does not exist.

- [ ] **Step 3: Add login form component**

Create `src/components/auth/magic-link-login-form.tsx`:

```tsx
"use client";

import { useActionState } from "react";

import { requestMagicLinkAction } from "@/app/auth/login/actions";
import type { MagicLinkActionState } from "@/app/auth/login/actions";

type MagicLinkLoginFormProps = {
  nextPath: string;
};

const initialState: MagicLinkActionState = {};

export function MagicLinkLoginForm({ nextPath }: MagicLinkLoginFormProps) {
  const [state, formAction, isPending] = useActionState(
    requestMagicLinkAction,
    initialState,
  );

  return (
    <form action={formAction} className="planner-paper-sheet planner-rule flex w-full max-w-md flex-col gap-4 rounded-lg border p-5 shadow-sm shadow-stone-200/60">
      <input type="hidden" name="next" value={nextPath} />

      <label className="flex flex-col gap-2">
        <span className="planner-ink text-sm font-medium">Email</span>
        <input
          className="planner-rule planner-ink rounded-md border bg-white px-3 py-2 text-base outline-none focus:border-[#397367]"
          dir="auto"
          name="email"
          required
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
        />
      </label>

      <button
        className="rounded-md bg-[#397367] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#2f5f55] disabled:cursor-not-allowed disabled:bg-[#94a19b]"
        disabled={isPending}
        type="submit"
      >
        {isPending ? "Sending..." : "Send sign-in link"}
      </button>

      {state.message ? (
        <p className="planner-ink-muted text-sm" role="status">
          {state.message}
        </p>
      ) : null}

      {state.error ? (
        <p className="planner-warn text-sm" role="alert">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
```

- [ ] **Step 4: Add login page**

Create `src/app/auth/login/page.tsx`:

```tsx
import { sanitizeNextPath } from "@/lib/auth/redirects";
import { MagicLinkLoginForm } from "@/components/auth/magic-link-login-form";

export const dynamic = "force-dynamic";

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
    next?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const nextPath = sanitizeNextPath(params.next);

  return (
    <main className="planner-paper flex min-h-screen items-center justify-center px-4 py-8">
      <section className="flex w-full max-w-md flex-col gap-5">
        <header className="flex flex-col gap-2">
          <p className="planner-accent text-sm font-semibold">Private planner</p>
          <h1 className="planner-ink text-3xl font-semibold tracking-normal">
            Sign in with email
          </h1>
          <p className="planner-ink-muted text-sm leading-6">
            Enter the email that has access to this planner.
          </p>
        </header>

        {params.error ? (
          <p className="planner-warn text-sm" role="alert">
            The sign-in link could not be used. Please request a new one.
          </p>
        ) : null}

        <MagicLinkLoginForm nextPath={nextPath} />
      </section>
    </main>
  );
}
```

- [ ] **Step 5: Add callback route**

Create `src/app/auth/callback/route.ts`:

```ts
import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import { isEmailInvited } from "@/lib/auth/invites";
import { sanitizeNextPath } from "@/lib/auth/redirects";
import { createClient } from "@/lib/supabase/server";

export async function handleAuthCallback(
  authSupabase: SupabaseClient,
  inviteSupabase: SupabaseClient,
  url: URL,
) {
  const code = url.searchParams.get("code");
  const nextPath = sanitizeNextPath(url.searchParams.get("next"));
  const loginUrl = new URL("/auth/login", url.origin);

  if (!code) {
    loginUrl.searchParams.set("error", "callback");
    return loginUrl.toString();
  }

  const { error } = await authSupabase.auth.exchangeCodeForSession(code);

  if (error) {
    loginUrl.searchParams.set("error", "callback");
    return loginUrl.toString();
  }

  const {
    data: { user },
  } = await authSupabase.auth.getUser();

  if (!user?.email || !(await isEmailInvited(inviteSupabase, user.email))) {
    await authSupabase.auth.signOut();
    loginUrl.searchParams.set("error", "access");
    return loginUrl.toString();
  }

  return new URL(nextPath, url.origin).toString();
}

export async function GET(request: Request) {
  const authSupabase = await createClient();
  const inviteSupabase = await createClient({ useServiceRole: true });
  const redirectUrl = await handleAuthCallback(
    authSupabase,
    inviteSupabase,
    new URL(request.url),
  );

  return NextResponse.redirect(redirectUrl);
}
```

- [ ] **Step 6: Run callback tests**

Run:

```bash
npm run test -- tests/auth/callback.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/components/auth/magic-link-login-form.tsx src/app/auth/login/page.tsx src/app/auth/callback/route.ts tests/auth/callback.test.ts
git commit -m "feat: add magic link auth pages"
```

## Task 5: Add Shared Protected Guard And Root Redirect

**Files:**
- Create: `src/lib/auth/guard.ts`
- Create: `tests/auth/guard.test.ts`
- Modify: `src/app/page.tsx`
- Modify: `src/app/(app)/planner/page.tsx`
- Modify: `src/app/(app)/inbox/page.tsx`
- Modify: `src/app/(app)/settings/page.tsx`

- [ ] **Step 1: Write failing guard tests**

Create `tests/auth/guard.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";

import { resolveInvitedUser } from "@/lib/auth/guard";

describe("resolveInvitedUser", () => {
  it("returns the user when the session and invite are valid", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: { active: true, expires_at: null },
      error: null,
    });
    const eq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq }));
    const signOut = vi.fn();
    const user = { id: "user-123", email: "USER@example.com" };
    const authSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }),
        signOut,
      },
    };
    const inviteSupabase = {
      from: vi.fn(() => ({ select })),
    };

    await expect(resolveInvitedUser(authSupabase as never, inviteSupabase as never)).resolves.toEqual(user);
    expect(signOut).not.toHaveBeenCalled();
  });

  it("returns null when no user is signed in", async () => {
    const authSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
        signOut: vi.fn(),
      },
    };
    const inviteSupabase = {
      from: vi.fn(),
    };

    await expect(resolveInvitedUser(authSupabase as never, inviteSupabase as never)).resolves.toBeNull();
  });

  it("signs out and returns null when the invite is invalid", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const eq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq }));
    const signOut = vi.fn().mockResolvedValue({ error: null });
    const authSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-123", email: "user@example.com" } },
          error: null,
        }),
        signOut,
      },
    };
    const inviteSupabase = {
      from: vi.fn(() => ({ select })),
    };

    await expect(resolveInvitedUser(authSupabase as never, inviteSupabase as never)).resolves.toBeNull();
    expect(signOut).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run guard tests to verify they fail**

Run:

```bash
npm run test -- tests/auth/guard.test.ts
```

Expected: FAIL because `src/lib/auth/guard.ts` does not exist.

- [ ] **Step 3: Implement protected guard**

Create `src/lib/auth/guard.ts`:

```ts
import { redirect } from "next/navigation";
import type { SupabaseClient, User } from "@supabase/supabase-js";

import { isEmailInvited } from "@/lib/auth/invites";
import { loginPathFor } from "@/lib/auth/redirects";
import { createClient } from "@/lib/supabase/server";

export async function resolveInvitedUser(
  authSupabase: SupabaseClient,
  inviteSupabase: SupabaseClient,
): Promise<User | null> {
  const {
    data: { user },
  } = await authSupabase.auth.getUser();

  if (!user?.email) {
    return null;
  }

  if (!(await isEmailInvited(inviteSupabase, user.email))) {
    await authSupabase.auth.signOut();
    return null;
  }

  return user;
}

export async function requireInvitedUser(currentPath: string) {
  const supabase = await createClient();
  const inviteSupabase = await createClient({ useServiceRole: true });
  const user = await resolveInvitedUser(supabase, inviteSupabase);

  if (!user) {
    redirect(loginPathFor(currentPath));
  }

  return { supabase, user };
}
```

- [ ] **Step 4: Update planner page**

In `src/app/(app)/planner/page.tsx`, replace the local `createClient()`, `getUser()`, and unauthenticated redirect block with:

```ts
import { requireInvitedUser } from "@/lib/auth/guard";
```

Inside `PlannerPage`:

```ts
const { supabase, user } = await requireInvitedUser("/planner");
```

Remove the unused `redirect` and `createClient` imports.

- [ ] **Step 5: Update inbox page**

In `src/app/(app)/inbox/page.tsx`, replace the local auth block with:

```ts
import { requireInvitedUser } from "@/lib/auth/guard";
```

Inside `InboxPage`:

```ts
const { supabase, user } = await requireInvitedUser("/inbox");
```

Remove the unused `redirect` and `createClient` imports.

- [ ] **Step 6: Update settings page**

In `src/app/(app)/settings/page.tsx`, replace the local auth block with:

```ts
import { requireInvitedUser } from "@/lib/auth/guard";
```

Inside `SettingsPage`:

```ts
const { supabase, user } = await requireInvitedUser("/settings");
```

Remove the unused `redirect` and `createClient` imports.

- [ ] **Step 7: Replace root page with auth redirect**

Replace `src/app/page.tsx` with:

```tsx
import { redirect } from "next/navigation";

import { resolveInvitedUser } from "@/lib/auth/guard";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = await createClient();
  const inviteSupabase = await createClient({ useServiceRole: true });
  const user = await resolveInvitedUser(supabase, inviteSupabase);

  if (user) {
    redirect("/planner");
  }

  redirect("/auth/login");
}
```

- [ ] **Step 8: Run guard tests**

Run:

```bash
npm run test -- tests/auth/guard.test.ts
```

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/lib/auth/guard.ts tests/auth/guard.test.ts src/app/page.tsx 'src/app/(app)/planner/page.tsx' 'src/app/(app)/inbox/page.tsx' 'src/app/(app)/settings/page.tsx'
git commit -m "feat: protect planner pages with invite guard"
```

## Task 6: Add Logout In Settings

**Files:**
- Create: `src/app/(app)/settings/logout-action.ts`
- Modify: `src/app/(app)/settings/page.tsx`

- [ ] **Step 1: Add logout action**

Create `src/app/(app)/settings/logout-action.ts`:

```ts
"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export async function signOutAction() {
  const supabase = await createClient();

  await supabase.auth.signOut();
  redirect("/auth/login");
}
```

- [ ] **Step 2: Add logout form to settings**

In `src/app/(app)/settings/page.tsx`, add:

```ts
import { signOutAction } from "./logout-action";
```

Add this section after the reminders section:

```tsx
<section className="planner-paper-sheet planner-rule rounded-lg border shadow-sm shadow-stone-200/60">
  <header className="planner-divider border-b px-4 py-3">
    <h2 className="planner-ink text-base font-semibold">Account</h2>
  </header>
  <form action={signOutAction} className="px-4 py-4">
    <button
      className="planner-rule planner-ink rounded-md border bg-white px-4 py-2 text-sm font-semibold transition-colors hover:bg-[#f8faf9]"
      type="submit"
    >
      Sign out
    </button>
  </form>
</section>
```

- [ ] **Step 3: Run lint**

Run:

```bash
npm run lint
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add 'src/app/(app)/settings/logout-action.ts' 'src/app/(app)/settings/page.tsx'
git commit -m "feat: add settings sign out"
```

## Task 7: Document Auth Setup And Update Smoke Test

**Files:**
- Modify: `README.md`
- Modify: `tests/e2e/planner.spec.ts`

- [ ] **Step 1: Add auth setup notes to README**

Add this section to `README.md` after `## Planner Setup`:

```md
## Authentication Setup

The app uses Supabase magic links and a private database invite list.

1. In Supabase, enable Email auth.
2. Configure the Supabase Site URL to the deployed app URL.
3. Add `http://localhost:3000/auth/callback` and the deployed `/auth/callback` URL to allowed redirect URLs.
4. Run `supabase/setup-owner-invite.sql.example` in the Supabase SQL editor after replacing `you@example.com`.
5. Use `/auth/login` to request a magic link for the invited email.

Uninvited emails receive the same on-screen response as invited emails, but the app does not request a Supabase magic link for them.
```

- [ ] **Step 2: Update E2E smoke test expectation**

Update `tests/e2e/planner.spec.ts` to assert the preserved `next` parameter:

```ts
import { expect, test } from "playwright/test";

test("planner redirects unauthenticated users to login with next path", async ({ page }) => {
  await page.goto("/planner");

  await expect(page).toHaveURL(/\/auth\/login\?next=%2Fplanner/);
});
```

- [ ] **Step 3: Run full verification**

Run:

```bash
npm run lint
npm run test
npm run build
npm run e2e
```

Expected: all commands pass.

- [ ] **Step 4: Commit**

```bash
git add README.md tests/e2e/planner.spec.ts
git commit -m "docs: add magic link auth setup"
```

## Spec Coverage Review

- Magic link only: Tasks 3 and 4.
- Private invite-only access: Tasks 1, 2, and 3.
- Database invite table with optional expiry: Tasks 1 and 2.
- Neutral login response: Task 3.
- Preserve `next` redirects: Tasks 3, 4, 5, and 7.
- Protected app guard: Task 5.
- Logout: Task 6.
- Root redirect: Task 5.
- Setup SQL and README notes: Tasks 1 and 7.
- Tests for invite checking, login action behavior, callback redirect behavior, and protected guard behavior: Tasks 2, 3, 4, and 5.
- Out-of-scope items are not included in implementation tasks.
