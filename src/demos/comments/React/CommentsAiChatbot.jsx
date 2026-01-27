import { useChat } from "@ai-sdk/react";
import { getAiToolkit } from "@tiptap-pro/ai-toolkit";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
} from "ai";
import { useState } from "react";

export function CommentsAiChatbot({ editor }) {
  const [input, setInput] = useState(
    "Add a comment to the first sentence of the last paragraph, that says 'well done'",
  );

  const { messages, sendMessage, addToolOutput } = useChat({
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

  return (
    <>
      <h2 className="text-xl font-semibold mb-2">AI Chat Assistant</h2>
      <div className="mb-4">
        {messages?.map((message) => (
          <div key={message.id} className="bg-gray-100 p-4 rounded-lg mb-2">
            <strong className="text-blue-600">{message.role}</strong>
            <br />
            <div className="mt-2 whitespace-pre-wrap">
              {message.parts
                .filter((p) => p.type === "text")
                .map((p) => p.text)
                .join("\n") || "Loading..."}
            </div>
          </div>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (input.trim()) {
            sendMessage({ text: input });
            setInput("");
          }
        }}
        className="flex gap-2"
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 border border-gray-300 rounded-lg px-4 py-2 w-full bg-white min-h-24"
          placeholder="Ask the AI to add comments..."
        />
        <button
          type="submit"
          className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600"
        >
          Send
        </button>
      </form>
    </>
  );
}
