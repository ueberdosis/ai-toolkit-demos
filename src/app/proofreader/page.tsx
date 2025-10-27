"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { AiToolkit, getAiToolkit } from "@tiptap-pro/ai-toolkit";
import { useRef, useState } from "react";
import "./proofreader.css";

const INITIAL_CONTENT = `<h1>Grammar Check Demo</h1><p>This is a excelent editor for writng documents. It have many feature's that makes it very powerfull.</p>`;

export default function Page() {
  // Editor for Changes Mode
  const editorChanges = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit, AiToolkit],
    content: INITIAL_CONTENT,
  });

  // Editor for Content Mode
  const editorContent = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit, AiToolkit],
    content: INITIAL_CONTENT,
  });

  const editorChangesRef = useRef(editorChanges);
  editorChangesRef.current = editorChanges;

  const editorContentRef = useRef(editorContent);
  editorContentRef.current = editorContent;

  // State for Changes Mode
  const [isCheckingChanges, setIsCheckingChanges] = useState(false);
  const [reviewStateChanges, setReviewStateChanges] = useState({
    isReviewing: false,
  });
  const [hasAcceptedChangesMode, setHasAcceptedChangesMode] = useState(false);

  // State for Content Mode
  const [isCheckingContent, setIsCheckingContent] = useState(false);
  const [reviewStateContent, setReviewStateContent] = useState({
    isReviewing: false,
  });
  const [hasAcceptedContentMode, setHasAcceptedContentMode] = useState(false);

  const checkGrammarChanges = async () => {
    const editor = editorChangesRef.current;
    if (!editor) return;

    setIsCheckingChanges(true);
    const toolkit = getAiToolkit(editor);
    const htmlToCheck = editor.getHTML();

    try {
      const response = await fetch("/api/grammar-check-changes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ html: htmlToCheck }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No reader available");
      }

      const decoder = new TextDecoder();
      let buffer = "";
      let previousChangeCount = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.trim()) continue;

          try {
            const parsed = JSON.parse(line);
            if (parsed.changes && Array.isArray(parsed.changes)) {
              const allChanges = parsed.changes;
              const currentChangeCount = allChanges.length;

              // Only process if we have new changes
              if (currentChangeCount > previousChangeCount) {
                // Filter invalid from ALL accumulated changes
                const validChanges = allChanges.filter(
                  (change: { insert: string; delete: string }) =>
                    change.insert?.trim() && change.delete?.trim(),
                );

                if (validChanges.length > 0) {
                  // Apply ALL accumulated valid changes
                  // setHtmlSuggestions handles diff detection internally
                  toolkit.setHtmlSuggestions({ changes: validChanges });

                  // Activate review mode on first suggestion
                  if (previousChangeCount === 0) {
                    setReviewStateChanges({ isReviewing: true });
                  }
                }

                previousChangeCount = currentChangeCount;
              }
            }
          } catch (parseError) {
            console.debug("Parse error (incomplete JSON):", parseError);
          }
        }
      }
    } catch (error) {
      console.error("Grammar check error:", error);
    } finally {
      setIsCheckingChanges(false);
    }
  };

  const checkGrammarContent = async () => {
    const editor = editorContentRef.current;
    if (!editor) return;

    setIsCheckingContent(true);
    const toolkit = getAiToolkit(editor);
    const htmlToCheck = editor.getHTML();

    try {
      const response = await fetch("/api/grammar-check-content", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ html: htmlToCheck }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.content && typeof result.content === "string") {
        toolkit.setHtmlSuggestions({ content: result.content });
        setReviewStateContent({ isReviewing: true });
      }
    } catch (error) {
      console.error("Grammar check error:", error);
    } finally {
      setIsCheckingContent(false);
    }
  };

  if (!editorChanges || !editorContent) return null;

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">Proofreader demo</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Granular Changes Mode */}
        <div className="border border-gray-200 rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-3">Granular Changes Mode</h2>
          <p className="text-gray-600 mb-4">
            Uses individual change objects to specify exact text replacements.
            Each correction is sent as a separate insert/delete pair.
          </p>

          <div className="mb-6">
            <EditorContent
              editor={editorChanges}
              className="border border-gray-300 rounded-lg p-4 min-h-[200px]"
            />
          </div>

          {!reviewStateChanges.isReviewing && (
            <button
              type="button"
              onClick={checkGrammarChanges}
              disabled={isCheckingChanges || hasAcceptedChangesMode}
              className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed w-full"
            >
              {isCheckingChanges ? "Checking..." : "Check Grammar"}
            </button>
          )}

          {reviewStateChanges.isReviewing && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-2">Review suggestions</h3>
              <p className="text-gray-600 mb-4 text-sm">
                Individual corrections are highlighted in the document.
              </p>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => {
                    const toolkit = getAiToolkit(editorChanges);
                    toolkit.applyAllSuggestions();
                    setHasAcceptedChangesMode(true);
                    setReviewStateChanges({ isReviewing: false });
                  }}
                  className="flex-1 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600"
                >
                  Accept all
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const toolkit = getAiToolkit(editorChanges);
                    toolkit.setSuggestions([]);
                    setReviewStateChanges({ isReviewing: false });
                  }}
                  className="flex-1 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600"
                >
                  Reject all
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Full Content Mode */}
        <div className="border border-gray-200 rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-3">Full Content Mode</h2>
          <p className="text-gray-600 mb-4">
            Provides the complete corrected HTML. The toolkit automatically
            detects differences and highlights all changes.
          </p>

          <div className="mb-6">
            <EditorContent
              editor={editorContent}
              className="border border-gray-300 rounded-lg p-4 min-h-[200px]"
            />
          </div>

          {!reviewStateContent.isReviewing && (
            <button
              type="button"
              onClick={checkGrammarContent}
              disabled={isCheckingContent || hasAcceptedContentMode}
              className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed w-full"
            >
              {isCheckingContent ? "Checking..." : "Check Grammar"}
            </button>
          )}

          {reviewStateContent.isReviewing && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-2">Review suggestions</h3>
              <p className="text-gray-600 mb-4 text-sm">
                All corrections are highlighted based on content diff.
              </p>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => {
                    const toolkit = getAiToolkit(editorContent);
                    toolkit.applyAllSuggestions();
                    setHasAcceptedContentMode(true);
                    setReviewStateContent({ isReviewing: false });
                  }}
                  className="flex-1 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600"
                >
                  Accept all
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const toolkit = getAiToolkit(editorContent);
                    toolkit.setSuggestions([]);
                    setReviewStateContent({ isReviewing: false });
                  }}
                  className="flex-1 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600"
                >
                  Reject all
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
