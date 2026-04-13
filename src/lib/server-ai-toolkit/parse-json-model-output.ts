import { streamText } from "ai";

export function parseJsonModelOutput<T>(rawOutput: string): T {
  const trimmedOutput = rawOutput.trim();
  const fencedMatch = trimmedOutput.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  const jsonSource = fencedMatch ? fencedMatch[1] : trimmedOutput;

  try {
    return JSON.parse(jsonSource) as T;
  } catch (error) {
    throw new Error(
      `Failed to parse model JSON output: ${
        error instanceof Error ? error.message : "Unknown error"
      }\n\nRaw output:\n${trimmedOutput}`,
    );
  }
}

export async function parseOrRepairJsonModelOutput<T>({
  rawOutput,
  model,
  providerOptions,
}: {
  rawOutput: string;
  // biome-ignore lint/suspicious/noExplicitAny: AI SDK model type is verbose here.
  model: any;
  providerOptions?: {
    openai?: {
      reasoningEffort?: "low" | "medium" | "high";
    };
  };
}): Promise<T> {
  try {
    return parseJsonModelOutput<T>(rawOutput);
  } catch {
    const repairResult = streamText({
      model,
      system:
        "You repair malformed JSON. Return only valid JSON with no markdown fences, no explanation, and no extra text.",
      prompt: `Repair this malformed JSON into valid JSON. Preserve the original structure and values as closely as possible.\n\n${rawOutput}`,
      providerOptions,
    });

    return parseJsonModelOutput<T>(await repairResult.text);
  }
}
