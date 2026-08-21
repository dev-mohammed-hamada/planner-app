import { parseCapture } from "@/lib/planner/capture-parser";
import { aiParseCapture as defaultAiParseCapture } from "@/lib/planner/ai-capture-parser";
import type { ParsedCapture } from "@/lib/planner/types";

const SEPARATOR_PATTERN = /(?:\s+and\s+|,|;|\s+then\s+)/i;
const ACTION_VERBS = new Set([
  "buy",
  "call",
  "send",
  "email",
  "finish",
  "write",
  "read",
  "meet",
  "see",
  "do",
  "fix",
  "review",
  "prepare",
  "plan",
  "schedule",
  "pay",
  "make",
  "book",
]);

export type CaptureOutcome = {
  items: ParsedCapture[];
  source: "regex" | "ai";
};

type CaptureOptions = {
  aiParse?: (text: string, baseDateISO: string) => Promise<ParsedCapture[]>;
};

export function shouldEscalateToAi(regexResult: ParsedCapture, text: string): boolean {
  if (regexResult.bucket === "inbox") {
    return true;
  }

  if (regexResult.bucket === "future_notes") {
    return false;
  }

  if (!SEPARATOR_PATTERN.test(text)) {
    return false;
  }

  const verbHits = text
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((token) => ACTION_VERBS.has(token));

  return verbHits.length >= 2;
}

export async function captureFromText(
  text: string,
  baseDateISO: string,
  options: CaptureOptions = {},
): Promise<CaptureOutcome> {
  const regexResult = parseCapture(text, baseDateISO);

  if (!shouldEscalateToAi(regexResult, text)) {
    return { items: [regexResult], source: "regex" };
  }

  const aiParse = options.aiParse ?? defaultAiParseCapture;
  const items = await aiParse(text, baseDateISO);

  return { items, source: "ai" };
}
