import type { UIMessage } from "ai";

export interface ServerAiToolkitMessageMetadata {
  sessionId?: string;
}

export type ServerAiToolkitMessage = UIMessage<ServerAiToolkitMessageMetadata>;

export function getSessionIdFromConversationHistory(
  messages: ServerAiToolkitMessage[],
): string | undefined {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const sessionId = messages[index]?.metadata?.sessionId;

    if (typeof sessionId === "string" && sessionId.length > 0) {
      return sessionId;
    }
  }

  return undefined;
}
