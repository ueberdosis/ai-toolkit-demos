"use client";

import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
} from "ai";
import { useChat } from "@ai-sdk/react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useRef, useState } from "react";
import { AiToolkit, getAiToolkit } from "@tiptap-pro/ai-toolkit";

export default function Page() {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit, AiToolkit],
    content: `<h1>AI Agent Demo</h1><p>Ask the AI to improve this.</p>`,
  });

  // Fixes issue: https://github.com/vercel/ai/issues/8148
  const editorRef = useRef(editor);
  editorRef.current = editor;

  // The AI Agent reads the document in chunks. This variable tracks of the current chunk
  // that the AI Agent is reading.
  const currentChunk = useRef(0);

  const { messages, sendMessage, addToolResult } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
    // transport: new DefaultChatTransport({ api: "http://localhost:8000/api/chat" }),
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    async onToolCall({ toolCall }) {
      console.log("🔧 Tool call received:", toolCall);
      const editor = editorRef.current;
      if (!editor) {
        console.error("❌ No editor available");
        return;
      }

      const { toolName, input, toolCallId } = toolCall;
      console.log(`🔧 Executing tool: ${toolName}, input:`, input, `toolCallId: ${toolCallId}`);

      // Use the AI Toolkit to execute the tool
      const toolkit = getAiToolkit(editor);
      const result = toolkit.executeTool({
        toolName,
        input,
        currentChunk: currentChunk.current,
      });

      console.log(`✅ Tool result:`, result);
      currentChunk.current = result.currentChunk;

      addToolResult({ tool: toolName, toolCallId, output: result.output });
      console.log(`📤 Added tool result for ${toolName}:`, result.output);
    },
  });

  const [input, setInput] = useState(
    "Replace the last paragraph with a short story about Tiptap"
  );

  if (!editor) return null;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">AI Agent Chatbot</h1>

      <div className="mb-6">
        <EditorContent
          editor={editor}
          className="border border-gray-300 rounded-lg p-4 min-h-[200px]"
        />
      </div>

      <div className="mb-6 space-y-4">
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
          className="flex-1 border border-gray-300 rounded-lg px-4 py-2"
          placeholder="Ask the AI to improve the document..."
        />
        <button
          type="submit"
          className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600"
        >
          Send
        </button>
      </form>
    </div>
  );
}
