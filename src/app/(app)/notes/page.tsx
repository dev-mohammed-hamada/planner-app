import {
  NotesDashboard,
  type NoteEntry,
  type NotesFutureItem,
  type NotesInboxItem,
  type WeeklyNoteEntry,
} from "@/components/notes/notes-dashboard";
import { requireInvitedUser } from "@/lib/auth/guard";
import { listNoteCollections } from "@/lib/notes/notes-repository";

export const dynamic = "force-dynamic";

type PlannerNotesRow = {
  id: string;
  title: string;
  bucket: "inbox" | "future_notes";
  created_at: string;
};

export default async function NotesPage() {
  const { supabase, user } = await requireInvitedUser("/notes");

  const [
    { data: plannerRows },
    { data: weeklyRows },
    collections,
    { data: notes },
  ] = await Promise.all([
    supabase
      .from("planner_items")
      .select("id,title,bucket,created_at")
      .eq("user_id", user.id)
      .neq("status", "deleted")
      .in("bucket", ["inbox", "future_notes"])
      .order("created_at", { ascending: false }),
    supabase
      .from("weekly_notes")
      .select("id,content,week_start_date")
      .eq("user_id", user.id)
      .order("week_start_date", { ascending: false })
      .limit(12),
    listNoteCollections(supabase, user.id),
    supabase
      .from("notes")
      .select("id,title,content,collection_id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("updated_at", { ascending: false }),
  ]);

  const rows = (plannerRows ?? []) as PlannerNotesRow[];

  const futureNotes: NotesFutureItem[] = rows
    .filter((row) => row.bucket === "future_notes")
    .map((row) => ({
      id: row.id,
      title: row.title,
      created_at: row.created_at,
    }));

  const inboxItems: NotesInboxItem[] = rows
    .filter((row) => row.bucket === "inbox")
    .map((row) => ({
      id: row.id,
      title: row.title,
      created_at: row.created_at,
    }));

  const weeklyNotes = (weeklyRows ?? []) as WeeklyNoteEntry[];
  const noteEntries = (notes ?? []) as NoteEntry[];

  return (
    <NotesDashboard
      collections={collections}
      futureNotes={futureNotes}
      inboxItems={inboxItems}
      notes={noteEntries}
      weeklyNotes={weeklyNotes}
    />
  );
}
