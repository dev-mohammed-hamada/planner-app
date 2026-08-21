import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/0003_platform_redesign_state.sql"),
  "utf8",
);

describe("platform redesign migration", () => {
  it("creates platform tables with RLS policies", () => {
    expect(migration).toContain("create table public.user_preferences");
    expect(migration).toContain("create table public.calendar_connections");
    expect(migration).toContain("create table public.note_collections");
    expect(migration).toContain("create table public.notes");
    expect(migration).toContain("alter table public.user_preferences enable row level security");
    expect(migration).toContain("calendar_connections_manage_own");
    expect(migration).toContain("note_collections_manage_own");
    expect(migration).toContain("notes_manage_own");
  });

  it("updates the new-user hook without replacing existing reminder definitions", () => {
    expect(migration).toContain("insert into public.user_preferences");
    expect(migration).toContain("insert into public.note_collections");
    expect(migration).not.toContain("create table public.reminder_preferences");
  });
});
