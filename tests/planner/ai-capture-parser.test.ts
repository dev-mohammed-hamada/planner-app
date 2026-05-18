import { describe, expect, it, vi } from "vitest";

import { AiParseError, aiParseCapture } from "@/lib/planner/ai-capture-parser";

function buildClient(response: unknown) {
  return {
    messages: {
      create: vi.fn().mockResolvedValue(response),
    },
  };
}

function toolUseResponse(items: unknown) {
  return {
    content: [
      {
        type: "tool_use",
        name: "extract_planner_items",
        input: { items },
      },
    ],
  };
}

describe("aiParseCapture", () => {
  it("returns a single ParsedCapture for one-item tool output", async () => {
    const client = buildClient(
      toolUseResponse([
        {
          title: "buy milk",
          item_type: "task",
          item_date: "2026-05-19",
          item_time: null,
          block: "unsorted",
          bucket: "weekly_spread",
        },
      ]),
    );

    const result = await aiParseCapture("buy milk tomorrow", "2026-05-18", { client: client as never });

    expect(result).toEqual([
      {
        title: "buy milk",
        originalText: "buy milk tomorrow",
        itemType: "task",
        itemDate: "2026-05-19",
        itemTime: null,
        block: "unsorted",
        bucket: "weekly_spread",
      },
    ]);
    expect(client.messages.create).toHaveBeenCalledOnce();
  });

  it("returns multiple ParsedCaptures when the tool emits multiple items", async () => {
    const client = buildClient(
      toolUseResponse([
        {
          title: "buy milk",
          item_type: "task",
          item_date: "2026-05-19",
          item_time: null,
          block: "unsorted",
          bucket: "weekly_spread",
        },
        {
          title: "call mom",
          item_type: "appointment",
          item_date: "2026-05-19",
          item_time: "16:00",
          block: "afternoon",
          bucket: "weekly_spread",
        },
      ]),
    );

    const result = await aiParseCapture("buy milk and call mom tomorrow at 4pm", "2026-05-18", {
      client: client as never,
    });

    expect(result).toHaveLength(2);
    expect(result[0].title).toBe("buy milk");
    expect(result[1].title).toBe("call mom");
    expect(result[1].itemTime).toBe("16:00");
  });

  it("throws AiParseError when the API rejects", async () => {
    const client = {
      messages: {
        create: vi.fn().mockRejectedValue(new Error("network down")),
      },
    };

    await expect(
      aiParseCapture("anything", "2026-05-18", { client: client as never }),
    ).rejects.toBeInstanceOf(AiParseError);
  });

  it("throws AiParseError when response has no tool_use block", async () => {
    const client = buildClient({ content: [{ type: "text", text: "I cannot help." }] });

    await expect(
      aiParseCapture("anything", "2026-05-18", { client: client as never }),
    ).rejects.toBeInstanceOf(AiParseError);
  });

  it("throws AiParseError when tool input has zero items", async () => {
    const client = buildClient(toolUseResponse([]));

    await expect(
      aiParseCapture("anything", "2026-05-18", { client: client as never }),
    ).rejects.toBeInstanceOf(AiParseError);
  });

  it("throws AiParseError when an item is missing required fields", async () => {
    const client = buildClient(
      toolUseResponse([
        {
          title: "buy milk",
          // missing item_type and others
        },
      ]),
    );

    await expect(
      aiParseCapture("buy milk", "2026-05-18", { client: client as never }),
    ).rejects.toBeInstanceOf(AiParseError);
  });

  it("throws AiParseError when ANTHROPIC_API_KEY is missing and no client is supplied", async () => {
    const previous = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;

    try {
      await expect(aiParseCapture("anything", "2026-05-18")).rejects.toBeInstanceOf(AiParseError);
    } finally {
      if (previous !== undefined) {
        process.env.ANTHROPIC_API_KEY = previous;
      }
    }
  });
});
