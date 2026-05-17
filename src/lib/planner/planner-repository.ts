import type { ParsedCapture } from "@/lib/planner/types";
import type { SupabaseClient } from "@supabase/supabase-js";

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
