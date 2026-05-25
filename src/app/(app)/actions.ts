"use server";

import { revalidatePath } from "next/cache";

import { captureFromText } from "@/lib/planner/capture";
import { todayInTimezone } from "@/lib/planner/dates";
import { saveParsedCapture } from "@/lib/planner/planner-repository";
import {
  applyQuickAddOverrides,
  type QuickAddOverrides,
} from "@/lib/planner/quick-add-overrides";
import { createClient } from "@/lib/supabase/server";
import type {
  DayBlock,
  PlannerBucket,
  PlannerItemType,
} from "@/lib/planner/types";

export type QuickAddActionState = {
  message?: string;
  error?: string;
};

type Profile = {
  timezone: string | null;
};

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

function revalidatePlannerSurfaces() {
  revalidatePath("/planner");
  revalidatePath("/calendar");
  revalidatePath("/notes");
  revalidatePath("/inbox");
}

function parseBlock(value: string): DayBlock | undefined {
  if (
    value === "morning" ||
    value === "afternoon" ||
    value === "evening" ||
    value === "unsorted" ||
    value === "none"
  ) {
    return value;
  }

  return undefined;
}

function parseBucket(value: string): PlannerBucket | undefined {
  if (value === "weekly_spread" || value === "inbox" || value === "future_notes") {
    return value;
  }

  return undefined;
}

function parseItemType(value: string): PlannerItemType | undefined {
  if (value === "task" || value === "appointment" || value === "note") {
    return value;
  }

  return undefined;
}

function buildOverrides(formData: FormData): QuickAddOverrides {
  const overrides: QuickAddOverrides = {};

  const itemDate = formValue(formData, "itemDate");
  if (itemDate) {
    overrides.itemDate = itemDate;
  }

  const itemTime = formValue(formData, "itemTime");
  if (itemTime) {
    overrides.itemTime = itemTime;
  }

  const block = parseBlock(formValue(formData, "block"));
  if (block) {
    overrides.block = block;
  }

  const bucket = parseBucket(formValue(formData, "bucket"));
  if (bucket) {
    overrides.bucket = bucket;
  }

  const itemType = parseItemType(formValue(formData, "itemType"));
  if (itemType) {
    overrides.itemType = itemType;
  }

  return overrides;
}

async function loadProfileTimezone(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<string> {
  const { data, error } = (await supabase
    .from("profiles")
    .select("timezone")
    .eq("id", userId)
    .maybeSingle()) as { data: Profile | null; error: Error | null };

  if (error) {
    throw error;
  }

  return data?.timezone || "UTC";
}

export async function createQuickAddAction(
  _state: QuickAddActionState,
  formData: FormData,
): Promise<QuickAddActionState> {
  try {
    const captureText = formValue(formData, "captureText").trim();

    if (!captureText) {
      return { error: "Add a capture before saving." };
    }

    const { supabase, user } = await currentUser();
    const timezone = await loadProfileTimezone(supabase, user.id);
    const baseDateISO = todayInTimezone(timezone);

    const outcome = await captureFromText(captureText, baseDateISO);
    const overrides = buildOverrides(formData);

    for (const item of outcome.items) {
      const finalItem = applyQuickAddOverrides(item, overrides);
      await saveParsedCapture(supabase, user.id, finalItem, "web");
    }

    revalidatePlannerSurfaces();

    return { message: "Saved to your planner." };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to save capture.";
    return { error: message };
  }
}
