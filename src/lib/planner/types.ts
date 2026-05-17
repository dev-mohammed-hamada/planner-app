export type DayBlock = "morning" | "afternoon" | "evening" | "unsorted" | "none";
export type PlannerBucket = "weekly_spread" | "inbox" | "future_notes";
export type PlannerItemType = "task" | "appointment" | "note";

export type ParsedCapture = {
  title: string;
  originalText: string;
  itemType: PlannerItemType;
  itemDate: string | null;
  itemTime: string | null;
  block: DayBlock;
  bucket: PlannerBucket;
};
