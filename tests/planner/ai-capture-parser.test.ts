import { describe, expect, it, vi } from "vitest";

import { AiParseError, aiParseCapture } from "@/lib/planner/ai-capture-parser";

function buildClient(response: unknown) {
  return {
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue(response),
      },
    },
  };
}

function jsonResponse(items: unknown) {
  return {
    choices: [
      {
        message: {
          role: "assistant",
          content: JSON.stringify({ items }),
          refusal: null,
        },
        finish_reason: "stop",
      },
    ],
  };
}

describe("aiParseCapture", () => {
  it("returns a single ParsedCapture for one-item structured output", async () => {
    const client = buildClient(
      jsonResponse([
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
    expect(client.chat.completions.create).toHaveBeenCalledOnce();
    const [requestBody] = client.chat.completions.create.mock.calls[0];
    expect(requestBody.reasoning_effort).toBe("minimal");
  });

  it("returns multiple ParsedCaptures when the model emits multiple items", async () => {
    const client = buildClient(
      jsonResponse([
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
      chat: {
        completions: {
          create: vi.fn().mockRejectedValue(new Error("network down")),
        },
      },
    };

    await expect(
      aiParseCapture("anything", "2026-05-18", { client: client as never }),
    ).rejects.toBeInstanceOf(AiParseError);
  });

  it("throws AiParseError when the model refuses", async () => {
    const client = buildClient({
      choices: [
        {
          message: { role: "assistant", content: null, refusal: "Cannot comply." },
          finish_reason: "stop",
        },
      ],
    });

    await expect(
      aiParseCapture("anything", "2026-05-18", { client: client as never }),
    ).rejects.toBeInstanceOf(AiParseError);
  });

  it("throws AiParseError when the response has no parsable content", async () => {
    const client = buildClient({ choices: [{ message: { role: "assistant", content: "not json" } }] });

    await expect(
      aiParseCapture("anything", "2026-05-18", { client: client as never }),
    ).rejects.toBeInstanceOf(AiParseError);
  });

  it("throws AiParseError when the structured output has zero items", async () => {
    const client = buildClient(jsonResponse([]));

    await expect(
      aiParseCapture("anything", "2026-05-18", { client: client as never }),
    ).rejects.toBeInstanceOf(AiParseError);
  });

  it("throws AiParseError when an item is missing required fields", async () => {
    const client = buildClient(
      jsonResponse([
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

  it("throws AiParseError when OPENAI_API_KEY is missing and no client is supplied", async () => {
    const previous = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;

    try {
      await expect(aiParseCapture("anything", "2026-05-18")).rejects.toBeInstanceOf(AiParseError);
    } finally {
      if (previous !== undefined) {
        process.env.OPENAI_API_KEY = previous;
      }
    }
  });
});
