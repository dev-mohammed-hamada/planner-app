import { redirect } from "next/navigation";
import type { SupabaseClient, User } from "@supabase/supabase-js";

import { isEmailInvited } from "@/lib/auth/invites";
import { loginPathFor, sanitizeNextPath } from "@/lib/auth/redirects";
import { createClient } from "@/lib/supabase/server";

export type AuthAccessResult =
  | { status: "allowed"; user: User }
  | { status: "missing" }
  | { status: "rejected" };

export function rejectedAuthPathFor(nextPath: string) {
  return `/auth/rejected?next=${encodeURIComponent(sanitizeNextPath(nextPath))}`;
}

export async function resolveAuthAccess(
  authSupabase: SupabaseClient,
  inviteSupabase: SupabaseClient,
): Promise<AuthAccessResult> {
  try {
    const {
      error,
      data: { user },
    } = await authSupabase.auth.getUser();

    if (error) {
      return { status: "rejected" };
    }

    if (!user) {
      return { status: "missing" };
    }

    if (!user.email) {
      return { status: "rejected" };
    }

    if (!(await isEmailInvited(inviteSupabase, user.email))) {
      return { status: "rejected" };
    }

    return { status: "allowed", user };
  } catch (error) {
    console.error("Could not resolve invited user", error);

    return { status: "rejected" };
  }
}

export async function resolveInvitedUser(
  authSupabase: SupabaseClient,
  inviteSupabase: SupabaseClient,
): Promise<User | null> {
  const access = await resolveAuthAccess(authSupabase, inviteSupabase);

  return access.status === "allowed" ? access.user : null;
}

export async function requireInvitedUser(currentPath: string) {
  const supabase = await createClient();
  const inviteSupabase = await createClient({ useServiceRole: true });
  const access = await resolveAuthAccess(supabase, inviteSupabase);

  if (access.status === "missing") {
    redirect(loginPathFor(currentPath));
  }

  if (access.status === "rejected") {
    redirect(rejectedAuthPathFor(currentPath));
  }

  return { supabase, user: access.user };
}
