"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import type { DayBlock } from "@/lib/planner/types";

type PlannerItemPatch = {
  title?: string;
  item_date?: string | null;
  block?: DayBlock;
  status?: "active" | "completed" | "deleted";
};

export async function updatePlannerItem(
  supabase: SupabaseClient,
  userId: string,
  itemId: string,
  patch: PlannerItemPatch,
) {
  const { error } = await supabase
    .from("planner_items")
    .update(patch)
    .eq("id", itemId)
    .eq("user_id", userId);

  if (error) {
    throw error;
  }
}

async function currentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not signed in");
  }

  return { supabase, user };
}

function formValue(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value : "";
}

function normalizeBlock(value: string): DayBlock {
  if (
    value === "morning" ||
    value === "afternoon" ||
    value === "evening" ||
    value === "unsorted" ||
    value === "none"
  ) {
    return value;
  }

  return "unsorted";
}

export async function completePlannerItemAction(formData: FormData) {
  const itemId = formValue(formData, "itemId");
  const { supabase, user } = await currentUser();

  await updatePlannerItem(supabase, user.id, itemId, { status: "completed" });
  revalidatePath("/planner");
}

export async function deletePlannerItemAction(formData: FormData) {
  const itemId = formValue(formData, "itemId");
  const { supabase, user } = await currentUser();

  await updatePlannerItem(supabase, user.id, itemId, { status: "deleted" });
  revalidatePath("/planner");
}

export async function editPlannerItemAction(formData: FormData) {
  const itemId = formValue(formData, "itemId");
  const title = formValue(formData, "title").trim();
  const block = normalizeBlock(formValue(formData, "block"));
  const itemDate = formValue(formData, "itemDate");

  if (!title) {
    throw new Error("Title is required");
  }

  const { supabase, user } = await currentUser();

  await updatePlannerItem(supabase, user.id, itemId, {
    title,
    block,
    item_date: itemDate || null,
  });
  revalidatePath("/planner");
}
