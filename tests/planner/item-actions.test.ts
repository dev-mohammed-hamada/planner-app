import { describe, expect, it, vi } from "vitest";

import { updatePlannerItem } from "@/app/(app)/planner/actions";

describe("updatePlannerItem", () => {
  it("updates only the provided patch for the signed-in user's planner item", async () => {
    const secondEq = vi.fn().mockResolvedValue({ error: null });
    const firstEq = vi.fn().mockReturnValue({ eq: secondEq });
    const update = vi.fn().mockReturnValue({ eq: firstEq });
    const from = vi.fn().mockReturnValue({ update });
    const supabase = { from };

    await updatePlannerItem(supabase as never, "user-123", "item-456", {
      block: "evening",
      title: "Call pharmacy",
    });

    expect(from).toHaveBeenCalledWith("planner_items");
    expect(update).toHaveBeenCalledWith({
      block: "evening",
      title: "Call pharmacy",
    });
    expect(update).not.toHaveBeenCalledWith(
      expect.objectContaining({
        item_date: expect.anything(),
        item_time: expect.anything(),
        status: expect.anything(),
      }),
    );
    expect(firstEq).toHaveBeenCalledWith("id", "item-456");
    expect(secondEq).toHaveBeenCalledWith("user_id", "user-123");
  });
});
