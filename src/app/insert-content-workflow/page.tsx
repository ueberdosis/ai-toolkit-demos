"use client";

import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { AiCaret, AiToolkit, getAiToolkit } from "@tiptap-pro/ai-toolkit";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { ToolbarPanel } from "../../components/toolbar-panel";
import "./selection.css";
import { Selection } from "@tiptap/extensions";

export default function Page() {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit, AiToolkit, Selection, AiCaret],
    content: `<p>Select some text and click the "Add emojis" button to add emojis to your selection.</p>
<p>This is another paragraph that you can select. Tiptap is a rich text editor that you can use to edit your text. It is a powerful tool that you can use to create beautiful documents. With the AI Toolkit, you can give your AI the ability to edit your document in real time.</p>
<p>This is yet another paragraph that you can select. Tiptap is a rich text editor that you can use to edit your text. It is a powerful tool that you can use to create beautiful documents. With the AI Toolkit, you can give your AI the ability to edit your document in real time.</p>`,
  });

  // Show a loading state when the AI is generating content
  const [isLoading, setIsLoading] = useState(false);

  // Disable the buttons when the selection is empty
  const selectionIsEmpty = useEditorState({
    editor,
    selector: (snapshot) => snapshot.editor?.state.selection.empty ?? true,
  });

  if (!editor) return null;

  const editSelection = async (task: string) => {
    editor.commands.blur();
    setIsLoading(true);

    const toolkit = getAiToolkit(editor);

    // Use the AI Toolkit to get the selection in HTML format
    const selection = toolkit.getHtmlSelection();
    const selectionPosition = editor.state.selection;

    // Call the API endpoint to get the edited HTML content
    const response = await fetch("/api/insert-content-workflow", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        task,
        replace: selection,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // The response is a stream of HTML content
    const readableStream = response.body;
    if (!readableStream) {
      throw new Error("No response body");
    }

    // Use the AI Toolkit to stream HTML into the selection
    await toolkit.streamHtml(readableStream, {
      position: selectionPosition,
      // Update the selection during streaming so that the selection always
      // spans the generated content
      onChunkInserted(event) {
        editor.commands.setTextSelection(event.range);
      },
    });

    setIsLoading(false);
  };

  const disabled = selectionIsEmpty || isLoading;

  const buttonClassName =
    "inline-flex items-center gap-1.5 rounded-lg border-none bg-[var(--gray-2)] text-[var(--black)] px-2.5 py-1.5 text-sm font-medium hover:bg-[var(--gray-3)] disabled:bg-[var(--gray-1)] disabled:text-[var(--gray-4)] transition-all duration-200 cursor-pointer disabled:cursor-not-allowed";

  return (
    <div className="flex flex-col h-screen">
      <ToolbarPanel>
        <button
          type="button"
          onClick={() => editSelection("Add emojis to this text")}
          disabled={disabled}
          className={buttonClassName}
        >
          {isLoading ? (
            <>
              <Loader2 className="animate-spin" size={14} /> Loading...
            </>
          ) : (
            "Add emojis"
          )}
        </button>
        <button
          type="button"
          onClick={() => editSelection("Make the text twice as long")}
          disabled={disabled}
          className={buttonClassName}
        >
          {isLoading ? (
            <>
              <Loader2 className="animate-spin" size={14} /> Loading...
            </>
          ) : (
            "Make text longer"
          )}
        </button>
      </ToolbarPanel>
      <div className="flex-1 overflow-y-auto">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
