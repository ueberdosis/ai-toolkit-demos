"use client";

import { experimental_useObject as useObject } from "@ai-sdk/react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  AiToolkit,
  getAiToolkit,
  tiptapEditWorkflowOutputSchema,
} from "@tiptap-pro/ai-toolkit";
import { useEffect, useState } from "react";
import { v4 as uuid } from "uuid";

import "./tiptap-edit.css";

const INITIAL_CONTENT = `<h1>Document Editor Demo</h1>
<p>This is a sample document that can be edited by AI. The text here is informal and could use some improvements.</p>
<p>You can ask the AI to make the text more formal, add more details, simplify it, or transform it in any way you like.</p>
<p>Try different tasks to see how the AI can help you edit your documents!</p>`;

export default function Page() {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit, AiToolkit],
    content: INITIAL_CONTENT,
  });

  const [isReviewing, setIsReviewing] = useState(false);
  const [hasAccepted, setHasAccepted] = useState(false);
  const [workflowId, setWorkflowId] = useState("");
  const [task, setTask] = useState("Make the text more formal and professional");

  const { submit, isLoading, object } = useObject({
    api: "/api/tiptap-edit-workflow",
    schema: tiptapEditWorkflowOutputSchema,
    onFinish: () => {
      setIsReviewing(true);
    },
  });

  const operations = object?.operations ?? [];

  // Stream partial results as they arrive
  useEffect(() => {
    if (!editor || !operations) return;

    const toolkit = getAiToolkit(editor);
    toolkit.tiptapEditWorkflow({
      operations,
      workflowId,
      reviewOptions: {
        mode: "preview",
      },
    });
  }, [operations, workflowId, editor]);

  if (!editor) return null;

  const editDocument = () => {
    const toolkit = getAiToolkit(editor);
    const { nodes } = toolkit.tiptapRead();
    setWorkflowId(uuid());
    submit({ nodes, task });
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">Tiptap Edit Workflow Demo</h1>

      <div className="mb-6">
        <EditorContent
          editor={editor}
          className="border border-gray-300 rounded-lg p-4 min-h-[200px]"
        />
      </div>

      <div className="mb-4">
        <label htmlFor="task" className="block text-sm font-medium text-gray-700 mb-2">
          Editing Task
        </label>
        <input
          id="task"
          type="text"
          value={task}
          onChange={(e) => setTask(e.target.value)}
          placeholder="Enter editing task..."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {!isReviewing && (
        <button
          type="button"
          onClick={editDocument}
          disabled={isLoading || hasAccepted || !task.trim()}
          className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed w-full"
        >
          {isLoading ? "Editing..." : "Edit Document"}
        </button>
      )}

      {isReviewing && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-2">Review changes</h3>
          <p className="text-gray-600 mb-4 text-sm">
            Changes are highlighted in the document above.
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

