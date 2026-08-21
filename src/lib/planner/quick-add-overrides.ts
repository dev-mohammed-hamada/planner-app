import { z } from "zod";

import type {
  DayBlock,
  ParsedCapture,
  PlannerBucket,
  PlannerItemType,
} from "@/lib/planner/types";

const overrideSchema = z.object({
  block: z.enum(["morning", "afternoon", "evening", "unsorted", "none"]).optional(),
  bucket: z.enum(["weekly_spread", "inbox", "future_notes"]).optional(),
  itemDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  itemTime: z.string().regex(/^\d{2}:\d{2}$/, "Time must use HH:MM format.").nullable().optional(),
  itemType: z.enum(["task", "appointment", "note"]).optional(),
});

export type QuickAddOverrides = {
  block?: DayBlock;
  bucket?: PlannerBucket;
  itemDate?: string | null;
  itemTime?: string | null;
  itemType?: PlannerItemType;
};

export function applyQuickAddOverrides(
  item: ParsedCapture,
  overrides: QuickAddOverrides,
): ParsedCapture {
  const parsed = overrideSchema.parse(overrides);
  const next: ParsedCapture = {
    ...item,
    block: parsed.block ?? item.block,
    bucket: parsed.bucket ?? item.bucket,
    itemDate: parsed.itemDate === undefined ? item.itemDate : parsed.itemDate,
    itemTime: parsed.itemTime === undefined ? item.itemTime : parsed.itemTime,
    itemType: parsed.itemType ?? item.itemType,
  };

  if (!next.itemDate) {
    return {
      ...next,
      block: "none",
      bucket: next.bucket === "future_notes" ? "future_notes" : "inbox",
      itemTime: null,
    };
  }

  return {
    ...next,
    bucket: "weekly_spread",
    block: next.block === "none" ? "unsorted" : next.block,
  };
}
