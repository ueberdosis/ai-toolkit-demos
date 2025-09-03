"use client";

import { useChat } from "@ai-sdk/react";
import { AiToolkit, getAiToolkit } from "@tiptap-pro/ai-toolkit";
import { Decoration } from "@tiptap/pm/view";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
} from "ai";
import { useRef, useState } from "react";
import "./suggestions.css";

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

  const [reviewState, setReviewState] = useState({
    // Whether to display the review UI
    isReviewing: false,
    // Data for the tool call result
    tool: "",
    toolCallId: "",
    output: "",
  });

  const { messages, sendMessage, addToolResult } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    async onToolCall({ toolCall }) {
      const editor = editorRef.current;
      if (!editor) return;

      const { toolName, input, toolCallId } = toolCall;

      // Use the AI Toolkit to execute the tool
      const toolkit = getAiToolkit(editor);
      const result = toolkit.executeTool({
        toolName,
        input,
        currentChunk: currentChunk.current,
        reviewOptions: {
          mode: "preview",
          displayOptions: {
            renderDecorations(options) {
              return [
                ...options.defaultRenderDecorations(),

                // Accept button
                Decoration.widget(options.range.to, () => {
                  const element = document.createElement("button");
                  element.textContent = "Accept";
                  element.className =
                    "ml-2 bg-green-500 text-white px-2 py-1 rounded text-sm hover:bg-green-600";
                  element.addEventListener("click", () => {
                    toolkit.applySuggestion(options.suggestion.id);
                  });
                  return element;
                }),

                // Reject button
                Decoration.widget(options.range.to, () => {
                  const element = document.createElement("button");
                  element.textContent = "Reject";
                  element.className =
                    "ml-2 bg-red-500 text-white px-2 py-1 rounded text-sm hover:bg-red-600";
                  element.addEventListener("click", () => {
                    toolkit.removeSuggestion(options.suggestion.id);
                  });
                  return element;
                }),
              ];
            },
          },
        },
      });

      currentChunk.current = result.currentChunk;

      // If the tool call modifies the document, halt the conversation and display the review UI
      if (result.docChanged) {
        // Show the review UI
        setReviewState({
          isReviewing: true,
          tool: toolName,
          toolCallId,
          output: result.output,
        });
      } else {
        // Continue the conversation
        addToolResult({ tool: toolName, toolCallId, output: result.output });
      }
    },
  });

  const [input, setInput] = useState(
    "Replace the last paragraph with a short story about Tiptap"
  );

  if (!editor) return null;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Review Changes Demo</h1>

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
                .join("\n")}
            </div>
          </div>
        ))}
      </div>

      {!reviewState.isReviewing && (
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
      )}

      {reviewState.isReviewing && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h2 className="text-xl font-semibold mb-4">Reviewing Changes</h2>
          <div className="flex gap-4">
            <button
              onClick={() => {
                const toolkit = getAiToolkit(editor);
                toolkit.applyAllSuggestions();
                addToolResult(reviewState);
                return setReviewState({
                  ...reviewState,
                  isReviewing: false,
                });
              }}
              className="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600"
            >
              Accept all
            </button>
            <button
              onClick={() => {
                const toolkit = getAiToolkit(editor);
                toolkit.setSuggestions([]);
                addToolResult({
                  ...reviewState,
                  output: "The changes were rejected",
                });
                return setReviewState({
                  ...reviewState,
                  isReviewing: false,
                });
              }}
              className="bg-red-500 text-white px-6 py-2 rounded-lg hover:bg-red-600"
            >
              Reject all
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
