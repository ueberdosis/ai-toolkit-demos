"use client";

import { experimental_useObject as useObject } from "@ai-sdk/react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  AiCaret,
  AiToolkit,
  getAiToolkit,
  tiptapEditWorkflowOutputSchema,
} from "@tiptap-pro/ai-toolkit";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { v4 as uuid } from "uuid";
import "../../styles/ai-caret.css";
import "./tiptap-edit.css";

const INITIAL_CONTENT = `<h1>Document Editor Demo</h1>
<p>This is a sample document that can be edited by AI. The text here is informal and could use some improvements.</p>
<p>You can ask the AI to make the text more formal, add more details, simplify it, or transform it in any way you like.</p>
<p>Try different tasks to see how the AI can help you edit your documents!</p>`;

export default function Page() {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit, AiToolkit, AiCaret],
    content: INITIAL_CONTENT,
  });

  const [workflowId, setWorkflowId] = useState("");
  const [task, setTask] = useState(
    "Make the text more formal and professional, but do not change the title",
  );

  const { submit, isLoading, object } = useObject({
    api: "/api/tiptap-edit-workflow",
    schema: tiptapEditWorkflowOutputSchema,
  });

  const operations = object?.operations ?? [];

  // Stream partial results as they arrive
  useEffect(() => {
    if (!editor || !operations) return;

    const toolkit = getAiToolkit(editor);
    toolkit.tiptapEditWorkflow({
      operations,
      workflowId,
      hasFinished: !isLoading,
    });
  }, [operations, workflowId, editor, isLoading]);

  if (!editor) return null;

  const editDocument = () => {
    const toolkit = getAiToolkit(editor);
    const { content } = toolkit.tiptapRead();
    setWorkflowId(uuid());
    submit({ content, task });
  };

  return (
    <div className="flex flex-col h-screen">
      <div className="flex flex-col sm:flex-row sm:items-start gap-2 border-b border-slate-200 bg-white px-4 py-3">
        <textarea
          value={task}
          onChange={(e) => {
            setTask(e.target.value);
            e.target.style.height = "auto";
            e.target.style.height = `${e.target.scrollHeight}px`;
          }}
          placeholder="Enter editing task..."
          rows={1}
          className="flex-1 resize-none border border-[var(--gray-3)] rounded-lg px-3 py-1.5 text-sm focus:border-[var(--purple)] focus:outline-none min-h-16 sm:min-h-0"
        />
        <button
          type="button"
          onClick={editDocument}
          disabled={isLoading || !task.trim()}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border-none bg-[var(--gray-2)] text-[var(--black)] px-2.5 py-1.5 text-sm font-medium hover:bg-[var(--gray-3)] disabled:bg-[var(--gray-1)] disabled:text-[var(--gray-4)] transition-all duration-200 cursor-pointer disabled:cursor-not-allowed w-full sm:w-auto"
        >
          {isLoading ? (
            <>
              <Loader2 className="animate-spin" size={14} /> Editing...
            </>
          ) : (
            "Edit Document"
          )}
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
