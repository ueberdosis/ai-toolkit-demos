"use client";

import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
} from "ai";
import { useChat } from "@ai-sdk/react";
import { Editor, EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useRef, useState } from "react";
import { AiToolkit, getAiToolkit } from "@tiptap-pro/ai-toolkit";

/**
 * One of the documents available in the app. Each
 * document has a name and a content.
 */
interface Document {
  /** The name/title of the document */
  name: string;
  /** The HTML content of the document */
  content: string;
}

/**
 * Initial set of documents available when the application starts
 */
const initialDocuments: Document[] = [
  {
    name: "Document 1",
    content:
      "<h1>Document 1</h1><p>This is the content of the first document.</p>",
  },
];

export default function Page() {
  // The editor instance of the current active document
  const editorRef = useRef<Editor | null>(null);
  // The list of documents
  const [documents, setDocuments] = useState(initialDocuments);
  // The name of the active document
  const [activeDocumentName, setActiveDocumentName] = useState("Document 1");

  /**
   * Find a document by name
   * @param documentName
   * @returns
   */
  const findDocument = (documentName: string) => {
    return documents.find((doc) => doc.name === documentName);
  };

  /**
   * The active document is the one that is open in the editor
   */
  const activeDocument = findDocument(activeDocumentName);

  /**
   * Call this function before switching to a new document, to save
   * the content of the active document
   */
  const saveActiveDocument = () => {
    const editor = editorRef.current;
    if (!editor) return;
    const content = editor.getHTML();
    setDocuments((documents) =>
      documents.map((doc) =>
        doc.name === activeDocumentName ? { ...doc, content } : doc
      )
    );
  };

  /**
   * Create a new document
   * @param documentName The name of the new document
   * @returns A message indicating the result of the operation
   */
  const createDocument = (documentName: string) => {
    saveActiveDocument();
    const existingDocument = findDocument(documentName);
    if (existingDocument) {
      setActiveDocumentName(documentName);
      return `Document already exists. Active document is now "${existingDocument.name}"`;
    }
    const newDocument = {
      name: documentName,
      content: "<p></p>",
    };
    setDocuments((documents) => [...documents, newDocument]);
    setActiveDocumentName(documentName);
    return `Document created. Active document is now "${documentName}"`;
  };

  /**
   * Delete a document
   * @param documentName The name of the document to delete
   * @returns A message indicating the result of the operation
   */
  const deleteDocument = (documentName: string) => {
    if (documentName === activeDocumentName) {
      return `Cannot delete the active document. Active document is "${activeDocumentName}". Switch to another document first.`;
    }
    const existingDocument = findDocument(documentName);
    if (!existingDocument) {
      return `Document does not exist. Active document is still "${activeDocumentName}"`;
    }
    setDocuments((documents) =>
      documents.filter((doc) => doc.name !== documentName)
    );
    return `Deleted document "${documentName}".`;
  };

  /**
   * Switch to a different document as the active document
   * @param documentName The name of the document to switch to
   * @returns A message indicating the result of the operation
   */
  const setActiveDocument = (documentName: string) => {
    const existingDocument = findDocument(documentName);
    if (!existingDocument) {
      return `Document does not exist.`;
    }
    saveActiveDocument();
    setActiveDocumentName(documentName);
    return `Switched to document "${documentName}".`;
  };

  /**
   * Get a formatted list of all documents and the currently active document
   * @returns A string containing the list of documents and active document name
   */
  const listDocuments = () => {
    return `Documents: ${documents
      .map((doc) => `"${doc.name}"`)
      .join(", ")}. Active document is "${activeDocumentName}".`;
  };

  /**
   * Handle tool calls from the AI agent, routing them to appropriate functions
   * @param toolCall The tool call object containing tool name, input, and ID
   * @returns The result of the tool execution with tool name, ID, and output
   */
  const handleToolCall = (toolCall: {
    toolName: string;
    input: unknown;
  }): string => {
    const editor = editorRef.current;
    if (!editor) return "";

    const { toolName, input } = toolCall;

    if (toolName === "createDocument") {
      return createDocument((input as { documentName: string }).documentName);
    } else if (toolName === "listDocuments") {
      return listDocuments();
    } else if (toolName === "setActiveDocument") {
      return setActiveDocument(
        (input as { documentName: string }).documentName
      );
    } else if (toolName === "deleteDocument") {
      return deleteDocument((input as { documentName: string }).documentName);
    }

    // Use the AI Toolkit to execute the tool
    const toolkit = getAiToolkit(editor);
    const result = toolkit.executeTool({
      toolName,
      input,
    });

    return result.output;
  };

  /**
   * Reference to the handleToolCall function to avoid stale closure issues
   * Fixes issue: https://github.com/vercel/ai/issues/8148
   */
  const handleToolCallRef = useRef(handleToolCall);
  handleToolCallRef.current = handleToolCall;

  const { messages, sendMessage, addToolResult, status } = useChat({
    transport: new DefaultChatTransport({ api: "/api/multi-document" }),
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    async onToolCall({ toolCall }) {
      const output = handleToolCallRef.current(toolCall);
      if (output) {
        addToolResult({
          tool: toolCall.toolName,
          toolCallId: toolCall.toolCallId,
          output,
        });
      }
    },
  });

  const [input, setInput] = useState(
    "Create 2 docs, one with a short poem and another with a short story about Tiptap"
  );

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">
        AI agent with multiple documents
      </h1>

      <div className="mb-6">
        <div className="flex flex-wrap gap-2">
          {documents.map((doc) => (
            <button
              key={doc.name}
              disabled={
                status === "streaming" || doc.name === activeDocumentName
              }
              className={`px-4 py-2 rounded-full border text-sm font-medium ${
                doc.name === activeDocumentName
                  ? "bg-blue-500 text-white border-blue-500 cursor-default"
                  : "bg-gray-100 text-gray-800 border-gray-200 hover:bg-blue-100"
              }`}
              onClick={() => setActiveDocument(doc.name)}
            >
              {doc.name}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-6">
        {activeDocument && (
          <EditorComponent
            key={activeDocument.name}
            initialContent={activeDocument.content}
            onEditorInitialized={(editor) => (editorRef.current = editor)}
          />
        )}
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
    </div>
  );
}

/**
 * Editor component that wraps the TipTap editor with AI toolkit support
 * @param initialContent The initial HTML content to display in the editor
 * @param onEditorInitialized Callback function called when the editor is initialized
 */
function EditorComponent({
  initialContent,
  onEditorInitialized,
}: {
  /** The initial HTML content to display in the editor */
  initialContent: string;
  /** Callback function called when the editor is initialized */
  onEditorInitialized: (editor: Editor) => void;
}) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit, AiToolkit],
    content: initialContent,
  });

  useEffect(() => {
    if (editor) {
      onEditorInitialized(editor);
    }
  }, [editor, onEditorInitialized]);

  return (
    <EditorContent
      editor={editor}
      content={initialContent}
      className="border border-gray-300 rounded-lg p-4 min-h-[200px]"
    />
  );
}
