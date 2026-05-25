import { revalidatePath } from "next/cache";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/planner/capture", () => ({
  captureFromText: vi.fn(),
}));

vi.mock("@/lib/planner/planner-repository", () => ({
  saveParsedCapture: vi.fn().mockResolvedValue(undefined),
}));

import { createQuickAddAction } from "@/app/(app)/actions";
import { captureFromText } from "@/lib/planner/capture";
import { saveParsedCapture } from "@/lib/planner/planner-repository";
import { createClient } from "@/lib/supabase/server";

function buildSupabase() {
  const profileQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({
      data: { timezone: "Asia/Gaza" },
      error: null,
    }),
  };

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "user-123" } },
      }),
    },
    from: vi.fn().mockReturnValue(profileQuery),
  };
}

describe("createQuickAddAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("saves captures through the existing parser and revalidates redesigned routes", async () => {
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(buildSupabase());
    (captureFromText as ReturnType<typeof vi.fn>).mockResolvedValue({
      source: "regex",
      items: [
        {
          title: "Call Sarah",
          originalText: "tomorrow call Sarah",
          itemType: "task",
          itemDate: "2026-05-26",
          itemTime: null,
          block: "unsorted",
          bucket: "weekly_spread",
        },
      ],
    });

    const formData = new FormData();
    formData.set("captureText", "tomorrow call Sarah");
    formData.set("itemDate", "2026-05-27");
    formData.set("itemTime", "09:30");
    formData.set("block", "morning");

    const state = await createQuickAddAction({}, formData);

    expect(saveParsedCapture).toHaveBeenCalledWith(
      expect.anything(),
      "user-123",
      expect.objectContaining({
        block: "morning",
        itemDate: "2026-05-27",
        itemTime: "09:30",
      }),
      "web",
    );
    expect(revalidatePath).toHaveBeenCalledWith("/planner");
    expect(revalidatePath).toHaveBeenCalledWith("/calendar");
    expect(revalidatePath).toHaveBeenCalledWith("/notes");
    expect(state).toEqual({ message: "Saved to your planner." });
  });
});
