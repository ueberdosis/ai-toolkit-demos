"use client";

import { experimental_useObject as useObject } from "@ai-sdk/react";
import { Decoration } from "@tiptap/pm/view";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  AiToolkit,
  getAiToolkit,
  proofreaderWorkflowOutputSchema,
  renderSlice,
} from "@tiptap-pro/ai-toolkit";
import { useEffect, useState } from "react";
import { v4 as uuid } from "uuid";

import "./proofreader.css";

const INITIAL_CONTENT = `<h1>Grammar Check Demo</h1>
<p>This is a excelent editor for writng documents. It have many feature's that makes it very powerfull.
Users can easyly create content, but sometimes they makes small mistake's that are hard to notice.
The tool also help you to edit faster and more effeciently, althou it not always perfect.
Its interface are simple, but it contain option's that may confuse new user's at first.</p>`;

export default function Page() {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit, AiToolkit],
    content: INITIAL_CONTENT,
  });

  const [isReviewing, setIsReviewing] = useState(false);
  const [hasAccepted, setHasAccepted] = useState(false);
  const [workflowId, setWorkflowId] = useState("");

  const { submit, isLoading, object } = useObject({
    api: "/api/proofreader",
    schema: proofreaderWorkflowOutputSchema,
    onFinish: () => {
      setIsReviewing(true);
    },
  });

  const operations = object?.operations ?? [];

  // Stream partial results as they arrive
  useEffect(() => {
    if (!editor || !operations) return;

    const toolkit = getAiToolkit(editor);
    toolkit.proofreaderWorkflow({
      operations,
      workflowId,
      reviewOptions: {
        mode: "preview",
        displayOptions: {
          renderDecorations: ({ range, suggestion, isSelected }) => {
            const operationMeta = suggestion.metadata?.operationMeta;
            const underlineColor =
              operationMeta === "grammar" ? "#d97706" : "#2563eb";
            const selectedBackgroundColor =
              operationMeta === "grammar"
                ? "rgba(217, 119, 6, 0.18)"
                : "rgba(37, 99, 235, 0.18)";

            const decorations = [
              Decoration.inline(range.from, range.to, {
                style: [
                  `box-shadow: inset 0 -2px 0 ${underlineColor}`,
                  isSelected
                    ? `background-color: ${selectedBackgroundColor}`
                    : "",
                ]
                  .filter(Boolean)
                  .join("; "),
              }),
            ];

            if (!isSelected) {
              return decorations;
            }

            const selectedReplacement = suggestion.replacementOptions[0];

            if (!selectedReplacement) {
              return decorations;
            }

            decorations.push(
              Decoration.widget(range.to, () => {
                const element = document.createElement("span");
                element.className =
                  "ml-2 inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium";
                element.style.borderColor = underlineColor;
                element.style.color = underlineColor;
                element.style.backgroundColor = "rgba(255, 255, 255, 0.95)";

                const label = document.createElement("span");
                const category =
                  operationMeta === "grammar" ? "Grammar" : "Spelling";
                label.textContent = `${category} suggestion: `;
                element.append(label);

                if (selectedReplacement.type === "slice") {
                  element.append(
                    renderSlice({
                      slice: selectedReplacement.addSlice,
                      editor,
                    }),
                  );
                } else {
                  const replacementText = document.createElement("span");
                  replacementText.textContent = selectedReplacement.addText;
                  element.append(replacementText);
                }

                return element;
              }),
            );

            return decorations;
          },
        },
      },
      hasFinished: !isLoading,
    });
  }, [operations, workflowId, editor, isLoading]);

  if (!editor) return null;

  const checkGrammar = () => {
    const toolkit = getAiToolkit(editor);
    const { content } = toolkit.tiptapRead();
    setWorkflowId(uuid());
    submit({ content });
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">Proofreader demo</h1>

      <div className="mb-6">
        <EditorContent
          editor={editor}
          className="border border-gray-300 rounded-lg p-4 min-h-50"
        />
      </div>

      {!isReviewing && (
        <button
          type="button"
          onClick={checkGrammar}
          disabled={isLoading || hasAccepted}
          className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed w-full"
        >
          {isLoading ? "Checking..." : "Check Grammar"}
        </button>
      )}

      {isReviewing && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-2">Review suggestions</h3>
          <p className="text-gray-600 mb-4 text-sm">
            Corrections are highlighted in the document above.
          </p>
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => {
                const toolkit = getAiToolkit(editor);
                toolkit.acceptAllSuggestions();
                setHasAccepted(true);
                setIsReviewing(false);
              }}
              className="flex-1 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600"
            >
              Accept all
            </button>
            <button
              type="button"
              onClick={() => {
                const toolkit = getAiToolkit(editor);
                toolkit.setSuggestions([]);
                setIsReviewing(false);
              }}
              className="flex-1 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600"
            >
              Reject all
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
