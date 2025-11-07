"use client";

import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { AiToolkit, getAiToolkit } from "@tiptap-pro/ai-toolkit";
import { useState } from "react";
import "./selection.css";
import { Selection } from "@tiptap/extensions";

export default function Page() {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit, AiToolkit, Selection],
    content: `<p>Select some text and click the "Add emojis" button to add emojis to your selection.</p>
<p></p>
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

  const editSelection = async (userRequest: string) => {
    setIsLoading(true);

    const toolkit = getAiToolkit(editor);

    // Use the AI Toolkit to get the selection in HTML format
    const selection = toolkit.getHtmlSelection();
    const selectionPosition = editor.state.selection;

    // Call the API endpoint to get the edited HTML content
    const response = await fetch("/api/inline-edits", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userRequest,
        selection,
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

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Inline edits demo</h1>

      <div className="mb-6">
        <EditorContent
          editor={editor}
          className="border border-gray-300 rounded-lg p-4 min-h-[200px]"
        />
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => editSelection("Add emojis to this text")}
          disabled={disabled}
          className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isLoading ? "Loading..." : "Add emojis"}
        </button>
        <button
          type="button"
          onClick={() => editSelection("Make the text twice as long")}
          disabled={disabled}
          className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isLoading ? "Loading..." : "Make text longer"}
        </button>
      </div>
    </div>
  );
}
