"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useRef, useState } from "react";
import { AiToolkit, getAiToolkit } from "@tiptap-pro/ai-toolkit";

export default function Page() {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit, AiToolkit],
    content: `<h1>Inline Edits Demo</h1><p>Select some text and click the "Emojify" button to add emojis to your selection!</p><p>This is another paragraph that you can select and emojify.</p>`,
  });

  // Fixes issue: https://github.com/vercel/ai/issues/8148
  const editorRef = useRef(editor);
  editorRef.current = editor;

  const [isLoading, setIsLoading] = useState(false);

  const handleEmojify = async () => {
    const editor = editorRef.current;
    if (!editor) return;

    const { from, to } = editor.state.selection;
    if (from === to) {
      alert("Please select some text first!");
      return;
    }

    const selection = editor.state.doc.textBetween(from, to);
    const userRequest = "Add emojis to this text";

    setIsLoading(true);

    try {
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

      const readableStream = response.body as ReadableStream<Uint8Array>;
      if (!readableStream) {
        throw new Error("No response body");
      }

      // Use the AI Toolkit to stream HTML into the selection
      const toolkit = getAiToolkit(editor);
      toolkit.streamHtml(readableStream);
    } catch (error) {
      console.error("Error calling emojify API:", error);
      alert("Error occurred while emojifying text. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!editor) return null;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Inline Edits Demo</h1>

      <div className="mb-6">
        <EditorContent
          editor={editor}
          className="border border-gray-300 rounded-lg p-4 min-h-[200px]"
        />
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleEmojify}
          disabled={isLoading}
          className="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isLoading ? "Emojifying..." : "Emojify"}
        </button>
      </div>
    </div>
  );
}
