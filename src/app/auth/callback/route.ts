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

  try {
    const {
      data: { user },
    } = await authSupabase.auth.getUser();

    if (user?.email && (await isEmailInvited(inviteSupabase, user.email))) {
      return new URL(nextPath, url.origin).toString();
    }
  } catch (error) {
    console.error("Could not validate auth callback access", error);
  }

  try {
    await authSupabase.auth.signOut();
  } catch (error) {
    console.error("Could not clear rejected auth callback session", error);
  }

  loginUrl.searchParams.set("error", "access");
  return loginUrl.toString();
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
