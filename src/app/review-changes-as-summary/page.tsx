"use client";

import { useChat } from "@ai-sdk/react";
import { Decoration } from "@tiptap/pm/view";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  AiToolkit,
  getAiToolkit,
  type SuggestionFeedbackEvent,
} from "@tiptap-pro/ai-toolkit";
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
    content: `<h1>AI agent demo</h1><p>Ask the AI to improve this.</p>`,
  });

  // Fixes issue: https://github.com/vercel/ai/issues/8148
  const editorRef = useRef(editor);
  editorRef.current = editor;

  const { messages, sendMessage, addToolOutput, status } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    async onToolCall({ toolCall }) {
      const editor = editorRef.current;
      if (!editor) return;

      const { toolName, input, toolCallId } = toolCall;

      // Reset feedback events when a new tool call starts
      setReviewState((prev) => ({ ...prev, userFeedback: [] }));

      // Use the AI Toolkit to execute the tool
      const toolkit = getAiToolkit(editor);
      const result = toolkit.executeTool({
        toolName,
        input,
      });

      addToolOutput({ tool: toolName, toolCallId, output: result.output });
    },
  });

  const [input, setInput] = useState(
    "Replace the last paragraph with a short story about Tiptap",
  );
  const [reviewState, setReviewState] = useState({
    isComparing: false,
    userFeedback: [] as SuggestionFeedbackEvent[],
  });

  if (!editor) return null;

  const toolkit = getAiToolkit(editor);

  function stopComparing() {
    toolkit.stopComparingDocuments();
    setReviewState((prev) => ({ ...prev, isComparing: false }));
  }

  const showReviewUI = reviewState.isComparing && status === "ready";

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">
        Review changes as summary demo
      </h1>

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

      {!showReviewUI && (
        <form
          onSubmit={(e) => {
            e.preventDefault();

            if (reviewState.isComparing) return;

            // Build message text with feedback if available
            let messageText = input.trim();
            if (reviewState.userFeedback.length > 0) {
              const feedbackOutput = JSON.stringify(reviewState.userFeedback);
              messageText += `\n\n<user_feedback>${feedbackOutput}</user_feedback>`;
            }

            toolkit.startComparingDocuments({
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
                        const result = toolkit.acceptSuggestion(
                          options.suggestion.id,
                        );
                        setReviewState((prev) => ({
                          ...prev,
                          userFeedback: [
                            ...prev.userFeedback,
                            ...result.aiFeedback.events,
                          ],
                        }));
                        if (toolkit.getSuggestions().length === 0) {
                          stopComparing();
                        }
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
                        const result = toolkit.rejectSuggestion(
                          options.suggestion.id,
                        );
                        setReviewState((prev) => ({
                          ...prev,
                          userFeedback: [
                            ...prev.userFeedback,
                            ...result.aiFeedback.events,
                          ],
                        }));
                        if (toolkit.getSuggestions().length === 0) {
                          stopComparing();
                        }
                      });
                      return element;
                    }),
                  ];
                },
              },
            });
            setReviewState((prev) => ({ ...prev, isComparing: true }));

            if (messageText) {
              sendMessage({ text: messageText });
              setInput("");
              setReviewState((prev) => ({ ...prev, userFeedback: [] }));
            }
          }}
          className="flex gap-2"
        >
          <input
            disabled={reviewState.isComparing}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 disabled:bg-gray-100"
            placeholder="Ask the AI to improve the document..."
          />
          <button
            type="submit"
            disabled={reviewState.isComparing}
            className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 disabled:bg-gray-400"
          >
            Send
          </button>
        </form>
      )}

      {showReviewUI && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h2 className="text-xl font-semibold mb-4">Reviewing changes</h2>
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => {
                const result = toolkit.acceptAllSuggestions();
                // Collect all feedback events
                const userFeedback = [
                  ...reviewState.userFeedback,
                  ...result.aiFeedback.events,
                ];
                setReviewState({
                  isComparing: false,
                  userFeedback,
                });
                toolkit.stopComparingDocuments();
              }}
              className="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600"
            >
              Accept all
            </button>
            <button
              type="button"
              onClick={() => {
                const result = toolkit.rejectAllSuggestions();
                // Collect all feedback events
                const userFeedback = [
                  ...reviewState.userFeedback,
                  ...result.aiFeedback.events,
                ];
                setReviewState({
                  isComparing: false,
                  userFeedback,
                });
                toolkit.stopComparingDocuments();
              }}
              className="bg-red-500 text-white px-6 py-2 rounded-lg hover:bg-red-600"
            >
              Reject all
            </button>
          </div>
        </div>
      )}
      <pre>{JSON.stringify(messages, null, 2)}</pre>
      <pre>{JSON.stringify(reviewState, null, 2)}</pre>
    </div>
  );
}
