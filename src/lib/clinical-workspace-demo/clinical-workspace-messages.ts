import { isToolUIPart, type UIMessage } from "ai";

/** A disconnected stream can leave a call without the result required by the model. */
export function prepareWorkspaceMessages(messages: UIMessage[]): UIMessage[] {
  return messages
    .map((message) => ({
      ...message,
      parts: message.parts.filter(
        (part) =>
          !isToolUIPart(part) ||
          part.state === "output-available" ||
          part.state === "output-error" ||
          part.state === "output-denied",
      ),
    }))
    .filter(
      (message) =>
        message.role !== "assistant" ||
        message.parts.some((part) => part.type !== "step-start"),
    );
}
