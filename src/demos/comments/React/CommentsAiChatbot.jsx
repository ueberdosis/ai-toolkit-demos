import { useChat } from "@ai-sdk/react";
import { getAiToolkit } from "@tiptap-pro/ai-toolkit";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
} from "ai";
import { useState } from "react";
import { ChatSidebar } from "../../../components/chat-sidebar";

export function CommentsAiChatbot({ editor }) {
  const [input, setInput] = useState(
    "Add a comment to the first sentence of the last paragraph, that says 'well done'",
  );

  const { messages, sendMessage, addToolOutput, status } = useChat({
    transport: new DefaultChatTransport({ api: "/api/comments" }),
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    async onToolCall({ toolCall }) {
      if (!editor) return;

      const { toolName, input, toolCallId } = toolCall;

      // Use the AI Toolkit to execute the tool
      const toolkit = getAiToolkit(editor);
      const result = toolkit.executeTool({
        toolName,
        input,
        commentsOptions: {
          threadData: { userName: "Tiptap AI" },
          commentData: { userName: "Tiptap AI" },
        },
      });

      addToolOutput({ tool: toolName, toolCallId, output: result.output });
    },
  });

  const isLoading = status !== "ready";

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.trim()) {
      sendMessage({ text: input });
      setInput("");
    }
  };

  return (
    <ChatSidebar
      embedded={true}
      messages={messages}
      input={input}
      onInputChange={setInput}
      onSubmit={handleSubmit}
      isLoading={isLoading}
      placeholder="Ask the AI to add comments..."
    />
  );
}
