import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

const createNoteSchema = z.object({
  collection_id: z.string().uuid().nullable(),
  content: z.string(),
  title: z.string().min(1),
});

export type NoteCollection = {
  id: string;
  name: string;
  sort_order: number;
};

export async function listNoteCollections(
  supabase: SupabaseClient,
  userId: string,
): Promise<NoteCollection[]> {
  const { data, error } = await supabase
    .from("note_collections")
    .select("id,name,sort_order")
    .eq("user_id", userId)
    .order("sort_order", { ascending: true });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function createNote(
  supabase: SupabaseClient,
  userId: string,
  input: { collection_id: string | null; title: string; content: string },
) {
  const parsed = createNoteSchema.parse(input);
  const { error } = await supabase.from("notes").insert({
    user_id: userId,
    collection_id: parsed.collection_id,
    title: parsed.title,
    content: parsed.content,
    status: "active",
  });

  if (error) {
    throw error;
  }
}
