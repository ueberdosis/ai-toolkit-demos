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

  const [reviewState, setReviewState] = useState({
    // Whether to display the review UI
    isReviewing: false,
    // Data for the tool call result
    tool: "",
    toolCallId: "",
    output: "",
    // Feedback events collected from user actions
    userFeedback: [] as SuggestionFeedbackEvent[],
  });

  const acceptButtonRef = useRef<HTMLButtonElement>(null);
  const rejectButtonRef = useRef<HTMLButtonElement>(null);

  const { messages, sendMessage, addToolOutput } = useChat({
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
                    const result = toolkit.acceptSuggestion(
                      options.suggestion.id,
                    );
                    // Collect feedback events using functional update
                    setReviewState((prev) => ({
                      ...prev,
                      userFeedback: [
                        ...prev.userFeedback,
                        ...result.aiFeedback.events,
                      ],
                    }));
                    if (toolkit.getSuggestions().length === 0) {
                      acceptButtonRef.current?.click();
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
                    // Collect feedback events using functional update
                    setReviewState((prev) => ({
                      ...prev,
                      userFeedback: [
                        ...prev.userFeedback,
                        ...result.aiFeedback.events,
                      ],
                    }));
                    if (toolkit.getSuggestions().length === 0) {
                      rejectButtonRef.current?.click();
                    }
                  });
                  return element;
                }),
              ];
            },
          },
        },
      });

      // If the tool call modifies the document, halt the conversation and display the review UI
      if (result.docChanged) {
        // Show the review UI
        setReviewState({
          isReviewing: true,
          tool: toolName,
          toolCallId,
          output: result.output,
          userFeedback: [],
        });
      } else {
        // Continue the conversation
        addToolOutput({ tool: toolName, toolCallId, output: result.output });
      }
    },
  });

  const [input, setInput] = useState(
    "Replace the last paragraph with a short story about Tiptap",
  );

  if (!editor) return null;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Review changes demo</h1>

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
          <h2 className="text-xl font-semibold mb-4">Reviewing changes</h2>
          <div className="flex gap-4">
            <button
              type="button"
              ref={acceptButtonRef}
              onClick={() => {
                const toolkit = getAiToolkit(editor);
                const result = toolkit.acceptAllSuggestions();
                // Combine all feedback events (previous + new)
                const userFeedback = [
                  ...reviewState.userFeedback,
                  ...result.aiFeedback.events,
                ];
                let output = reviewState.output;

                // Add feedback to tool output if there are any changes that were not accepted
                if (
                  userFeedback.length > 0 &&
                  userFeedback.some((event) => !event.accepted)
                ) {
                  output += `\n\n<user_feedback>\n${JSON.stringify(userFeedback)}\n</user_feedback>`;
                }

                addToolOutput({
                  tool: reviewState.tool,
                  toolCallId: reviewState.toolCallId,
                  output,
                });
                // Reset feedback events and close review UI
                setReviewState({
                  ...reviewState,
                  isReviewing: false,
                  userFeedback: [],
                });
              }}
              className="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600"
            >
              Accept all
            </button>
            <button
              type="button"
              ref={rejectButtonRef}
              onClick={() => {
                const toolkit = getAiToolkit(editor);
                const result = toolkit.rejectAllSuggestions();
                // Combine all feedback events (previous + new)
                const userFeedback = [
                  ...reviewState.userFeedback,
                  ...result.aiFeedback.events,
                ];
                // Combine rejection message with feedback in XML tags
                const rejectionMessage =
                  "Some changes you made were rejected by the user. Ask the user why, and what you can do to improve them.";
                const outputWithFeedback = `${rejectionMessage}\n\n<user_feedback>\n${JSON.stringify(userFeedback)}\n</user_feedback>`;
                addToolOutput({
                  tool: reviewState.tool,
                  toolCallId: reviewState.toolCallId,
                  output: outputWithFeedback,
                });
                // Reset feedback events and close review UI
                setReviewState({
                  ...reviewState,
                  isReviewing: false,
                  userFeedback: [],
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
