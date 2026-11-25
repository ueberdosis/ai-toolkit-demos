import assert from "node:assert/strict";
import { test } from "node:test";
import { convertToModelMessages, generateText, MissingToolResultsError } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { prepareWorkspaceMessages } from "../clinical-workspace-messages.ts";

const result = {
  content: [{ type: "text", text: "Recovered" }],
  finishReason: { unified: "stop", raw: "stop" },
  usage: {
    inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 },
    outputTokens: { total: 1, text: 1, reasoning: 0 },
  },
  warnings: [],
};

test("a user can retry after a tool stream disconnects without losing completed history", async () => {
  const completed = {
    type: "tool-tiptapQuery", toolCallId: "completed", state: "output-available",
    input: { documentId: "protocol", query: { operations: [] } },
    output: { documentId: "protocol", result: { text: "Study protocol" } },
  };
  const history = [
    { id: "user", role: "user", parts: [{ type: "text", text: "Compare the study documents." }] },
    { id: "assistant", role: "assistant", parts: [
      { type: "text", text: "I will compare the documents." },
      completed,
      { type: "step-start" },
      { type: "tool-tiptapQuery", toolCallId: "interrupted", state: "input-available", input: { documentId: "consent", query: { operations: [] } } },
      { type: "tool-tiptapQuery", toolCallId: "partial", state: "input-streaming", input: {} },
    ] },
    { id: "retry", role: "user", parts: [{ type: "text", text: "Please try again." }] },
  ];
  const model = new MockLanguageModelV4({ doGenerate: result });
  await assert.rejects(generateText({ model, messages: await convertToModelMessages(history), maxRetries: 0 }), MissingToolResultsError.isInstance);
  const prepared = prepareWorkspaceMessages(history);
  const recovered = await generateText({ model, messages: await convertToModelMessages(prepared), maxRetries: 0 });
  assert.equal(recovered.text, "Recovered");
  assert.ok(prepared[1].parts.includes(completed));
  assert.equal(prepared[1].parts[0].text, "I will compare the documents.");
  assert.equal(history[1].parts.length, 5, "the browser's original history is not mutated");
});

test("an assistant message containing only an interrupted tool step is removed", () => {
  const user = { id: "retry", role: "user", parts: [{ type: "text", text: "Try again" }] };
  assert.deepEqual(prepareWorkspaceMessages([
    { id: "partial", role: "assistant", parts: [
      { type: "step-start" },
      { type: "tool-tiptapQuery", toolCallId: "partial", state: "input-streaming", input: {} },
    ] },
    user,
  ]), [user]);
});
