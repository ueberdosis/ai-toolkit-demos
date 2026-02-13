"use client";

import { useChat } from "@ai-sdk/react";
import { type Editor, EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { AiToolkit, getAiToolkit } from "@tiptap-pro/ai-toolkit";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
} from "ai";
import { useEffect, useRef, useState } from "react";
import { ChatSidebar } from "../../components/chat-sidebar";

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
        doc.name === activeDocumentName ? { ...doc, content } : doc,
      ),
    );
  };

  /**
   * Create a new document
   * @param documentName The name of the new document
   * @returns A message indicating the result of the operation
   */
  const createDocument = (documentName: string, content: string) => {
    saveActiveDocument();
    const existingDocument = findDocument(documentName);
    if (existingDocument) {
      setActiveDocumentName(documentName);
      return `Document already exists. Active document is now "${existingDocument.name}"`;
    }
    const newDocument = {
      name: documentName,
      content: content,
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
      documents.filter((doc) => doc.name !== documentName),
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
      const createDocumentInput = input as {
        documentName: string;
        content: string;
      };
      return createDocument(
        createDocumentInput.documentName,
        createDocumentInput.content,
      );
    } else if (toolName === "listDocuments") {
      return listDocuments();
    } else if (toolName === "setActiveDocument") {
      return setActiveDocument(
        (input as { documentName: string }).documentName,
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

    return JSON.stringify(result.output);
  };

  const { messages, sendMessage, addToolOutput, status } = useChat({
    transport: new DefaultChatTransport({ api: "/api/multi-document" }),
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    async onToolCall({ toolCall }) {
      const output = handleToolCall(toolCall);
      if (output) {
        addToolOutput({
          tool: toolCall.toolName,
          toolCallId: toolCall.toolCallId,
          output: output as unknown as undefined,
        });
      }
    },
  });

  const [input, setInput] = useState(
    "Create 2 docs, one with a short poem and another with a short story about Tiptap",
  );

  const isLoading = status !== "ready";

  const handleSubmit = (e: SubmitEvent) => {
    e.preventDefault();
    if (input.trim()) {
      sendMessage({ text: input });
      setInput("");
    }
  };

  return (
    <div className="flex h-screen">
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Document tabs bar */}
        <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-2 overflow-x-auto flex-nowrap">
          {documents.map((doc) => (
            <button
              type="button"
              key={doc.name}
              disabled={
                status === "streaming" || doc.name === activeDocumentName
              }
              className={
                doc.name === activeDocumentName
                  ? "bg-[var(--purple)] text-white rounded-full px-3 py-1 text-sm font-medium flex-shrink-0 whitespace-nowrap"
                  : "bg-[var(--gray-2)] text-[var(--black)] rounded-full px-3 py-1 text-sm font-medium hover:bg-[var(--gray-3)] flex-shrink-0 whitespace-nowrap"
              }
              onClick={() => setActiveDocument(doc.name)}
            >
              {doc.name}
            </button>
          ))}
        </div>
        {/* Editor */}
        <div className="flex-1 overflow-y-auto">
          {activeDocument && (
            <EditorComponent
              key={activeDocument.name}
              initialContent={activeDocument.content}
              onEditorInitialized={(editor) => {
                editorRef.current = editor;
              }}
            />
          )}
        </div>
      </div>
      <ChatSidebar
        messages={messages}
        input={input}
        onInputChange={setInput}
        onSubmit={handleSubmit}
        isLoading={!!isLoading}
        placeholder="Ask the AI to improve the document..."
      />
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
      className="min-h-[200px]"
    />
  );
}
