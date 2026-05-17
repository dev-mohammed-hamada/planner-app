import type { ParsedCapture } from "@/lib/planner/types";

type PlannerItemInsert = {
  user_id: string;
  title: string;
  original_text: string;
  item_type: ParsedCapture["itemType"];
  item_date: string | null;
  item_time: string | null;
  block: ParsedCapture["block"];
  bucket: ParsedCapture["bucket"];
  source: "telegram";
};

type InsertResult = {
  error: unknown;
};

export type SupabaseClient = {
  from(table: "planner_items"): {
    insert(payload: PlannerItemInsert): Promise<InsertResult> | InsertResult;
  };
};

export async function saveParsedCapture(
  supabase: SupabaseClient,
  userId: string,
  parsed: ParsedCapture,
) {
  const { error } = await supabase.from("planner_items").insert({
    user_id: userId,
    title: parsed.title,
    original_text: parsed.originalText,
    item_type: parsed.itemType,
    item_date: parsed.itemDate,
    item_time: parsed.itemTime,
    block: parsed.block,
    bucket: parsed.bucket,
    source: "telegram",
  });

  if (error) {
    throw error;
  }
}
