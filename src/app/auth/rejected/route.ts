import { NextResponse } from "next/server";

import { sanitizeNextPath } from "@/lib/auth/redirects";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const nextPath = sanitizeNextPath(url.searchParams.get("next"));
  const supabase = await createClient();

  await supabase.auth.signOut();

  const loginUrl = new URL("/auth/login", url.origin);
  loginUrl.searchParams.set("next", nextPath);
  loginUrl.searchParams.set("error", "access");

  return NextResponse.redirect(loginUrl);
}
