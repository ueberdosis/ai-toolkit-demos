"use client";

import { useChat } from "@ai-sdk/react";
import { getAiToolkit } from "@tiptap-pro/ai-toolkit";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
} from "ai";
import { useRef, useState } from "react";
import CommentsWithCallback from "../../demos/comments/React/CommentsWithCallback";
import "../../demos/style.scss";

export default function Page() {
  const [editor, setEditor] = useState(null);
  const [input, setInput] = useState("Add a comment to the first sentence of the last paragraph, that says 'well done'");

  // Fixes issue: https://github.com/vercel/ai/issues/8148
  const editorRef = useRef(editor);
  editorRef.current = editor;

  const { messages, sendMessage, addToolResult } = useChat({
    transport: new DefaultChatTransport({ api: "/api/comments" }),
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    async onToolCall({ toolCall }) {
      const editor = editorRef.current;
      if (!editor) return;

      const { toolName, input, toolCallId } = toolCall;
      console.log("toolName", toolName);
      console.log("input", input);

      // Use the AI Toolkit to execute the tool
      const toolkit = getAiToolkit(editor);
      const result = toolkit.executeTool({
        toolName,
        input,
      });

      console.log("result.output", result.output);

      addToolResult({ tool: toolName, toolCallId, output: result.output });
    },
  });

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Comments Demo with AI Chat</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left side - Comments Demo */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">
            Rich Text Editor with Comments
          </h2>
          <div className="border border-gray-300 rounded-lg">
            <CommentsWithCallback onEditorReady={setEditor} />
          </div>
        </div>

        {/* Right side - Chat Interface */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">AI Chat Assistant</h2>

          {/* Chat Messages */}
          <div className="border border-gray-300 rounded-lg p-4 min-h-[300px] max-h-[400px] overflow-y-auto space-y-4">
            {messages?.map((message) => (
              <div key={message.id} className="bg-gray-100 p-4 rounded-lg">
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

          {/* Chat Input */}
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
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2 w-full bg-white"
              placeholder="Ask the AI to help with the document..."
            />
            <button
              type="submit"
              className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600"
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
