"use client";

import { experimental_useObject as useObject } from "@ai-sdk/react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  AiToolkit,
  getAiToolkit,
  commentsWorkflowOutputSchema,
} from "@tiptap-pro/ai-toolkit";
import { Comments, TiptapCollabProvider } from "@tiptap-pro/extension-comments";
import { useEffect, useMemo, useState } from "react";

import "./comments-workflow.css";

const INITIAL_CONTENT = `<h1>Comments Workflow Demo</h1>
<p>This is a sample document where AI can manage comments and threads. The AI can add feedback, suggest improvements, or highlight areas that need attention.</p>
<p>Try asking the AI to add comments about the content, review the writing style, or suggest edits!</p>`;

export default function Page() {
  // Create a simple in-memory comments provider
  const provider = useMemo(() => {
    return new TiptapCollabProvider({
      appId: "demo",
      name: "comments-workflow-demo",
    });
  }, []);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      AiToolkit,
      Comments.configure({
        provider,
      }),
    ],
    content: INITIAL_CONTENT,
  });

  const [task, setTask] = useState(
    "Add a helpful comment suggesting improvements to this document"
  );
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [resultMessage, setResultMessage] = useState("");

  const { submit, isLoading, object } = useObject({
    api: "/api/comments-workflow",
    schema: commentsWorkflowOutputSchema,
    onFinish: (result) => {
      if (result.error) {
        setStatus("error");
        setResultMessage("An error occurred while processing comments.");
      } else {
        setStatus("success");
        setResultMessage("Comments processed successfully!");
      }
    },
  });

  const operations = object?.operations ?? [];

  // Apply operations as they arrive
  useEffect(() => {
    if (!editor || operations.length === 0) return;

    const toolkit = getAiToolkit(editor);
    const result = toolkit.editThreadsWorkflow({
      operations,
    });

    if (result.success && result.docChanged) {
      setResultMessage(
        `Applied ${result.operations.length} comment operation(s)`
      );
    }
  }, [operations, editor]);

  if (!editor) return null;

  const manageComments = () => {
    setStatus("loading");
    setResultMessage("");

    const toolkit = getAiToolkit(editor);

    // Get the document content and existing threads
    const { nodes } = toolkit.tiptapRead();
    const { threads } = toolkit.getThreads();

    // Call the API endpoint to start the workflow
    submit({ nodes, threads, task });
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">Comments Workflow Demo</h1>

      <div className="mb-6">
        <EditorContent
          editor={editor}
          className="border border-gray-300 rounded-lg p-4 min-h-[200px]"
        />
      </div>

      <div className="mb-4">
        <label
          htmlFor="task"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Comment Task
        </label>
        <input
          id="task"
          type="text"
          value={task}
          onChange={(e) => setTask(e.target.value)}
          placeholder="Enter task for managing comments..."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <button
        type="button"
        onClick={manageComments}
        disabled={isLoading || !task.trim()}
        className="bg-purple-500 text-white px-6 py-2 rounded-lg hover:bg-purple-600 disabled:bg-gray-400 disabled:cursor-not-allowed w-full mb-4"
      >
        {isLoading ? "Processing Comments..." : "Manage Comments with AI"}
      </button>

      {status === "success" && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-800">{resultMessage}</p>
        </div>
      )}

      {status === "error" && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{resultMessage}</p>
        </div>
      )}
    </div>
  );
}
