import {
  NotesDashboard,
  type NotesFutureItem,
  type NotesInboxItem,
  type WeeklyNoteEntry,
} from "@/components/notes/notes-dashboard";
import { requireInvitedUser } from "@/lib/auth/guard";

export const dynamic = "force-dynamic";

type PlannerNotesRow = {
  id: string;
  title: string;
  bucket: "inbox" | "future_notes";
  created_at: string;
};

export default async function NotesPage() {
  const { supabase, user } = await requireInvitedUser("/notes");

  const { data: plannerRows } = await supabase
    .from("planner_items")
    .select("id,title,bucket,created_at")
    .eq("user_id", user.id)
    .neq("status", "deleted")
    .in("bucket", ["inbox", "future_notes"])
    .order("created_at", { ascending: false });

  const { data: weeklyRows } = await supabase
    .from("weekly_notes")
    .select("id,content,week_start_date")
    .eq("user_id", user.id)
    .order("week_start_date", { ascending: false })
    .limit(12);

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

  return (
    <NotesDashboard
      futureNotes={futureNotes}
      inboxItems={inboxItems}
      weeklyNotes={weeklyNotes}
    />
  );
}
