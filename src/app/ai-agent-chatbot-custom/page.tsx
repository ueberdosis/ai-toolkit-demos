"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useRef, useState } from "react";
import { AiToolkit, getAiToolkit } from "@tiptap-pro/ai-toolkit";

// Message types matching Vercel AI SDK format
interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content?: string;
  parts?: MessagePart[];
}

interface MessagePart {
  type: "text" | "tool_call" | "tool_result";
  text?: string;
  toolCallId?: string;
  toolName?: string;
  args?: Record<string, unknown>;
  result?: unknown;
}

export default function Page() {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit, AiToolkit],
    content: `<h1>AI Agent Demo (Custom GPT-5)</h1><p>Ask the AI to improve this document using direct GPT-5 function calling.</p>`,
  });

  // Fixes issue: https://github.com/vercel/ai/issues/8148
  const editorRef = useRef(editor);
  editorRef.current = editor;

  // The AI Agent reads the document in chunks. This variable tracks of the current chunk
  // that the AI Agent is reading.
  const currentChunk = useRef(0);
  // Track the active stream reader so we can cancel when a tool call arrives
  const streamReaderRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);

  // Custom state management replicating useChat behavior
  const [messages, setMessages] = useState<Message[]>([]);

  // Custom sendMessage function replicating useChat
  const sendMessage = async (text: string) => {
    if (!text.trim()) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text,
    };

    setMessages(prev => [...prev, userMessage]);

    try {
      // Send to our backend
      const response = await fetch("http://localhost:8000/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: buildBackendMessages([...messages, userMessage]),
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader available");
      // Abort controller to stop the stream when needed
      const controller = new AbortController();
      streamReaderRef.current = reader;

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        parts: [],
      };

      setMessages(prev => [...prev, assistantMessage]);

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ") && !line.includes("[DONE]")) {
            try {
              const data = JSON.parse(line.slice(6));
              await handleStreamChunk(data, assistantMessage.id);
            } catch (e) {
              console.error("Error parsing stream chunk:", e);
            }
          }
        }
      }
    } catch (error) {
      console.error("Error sending message:", error);
      // Add error message
      setMessages(prev => [...prev, {
        id: (Date.now() + 2).toString(),
        role: "assistant",
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }]);
    }
  };

  // Custom tool call handler replicating useChat onToolCall
  const handleToolCall = async (
    toolCall: { toolName: string; input: Record<string, unknown>; toolCallId: string },
    assistantMessageId: string
  ) => {
    console.log("🔧 Tool call received:", toolCall);
    const editor = editorRef.current;
    if (!editor) {
      console.error("❌ No editor available");
      return;
    }

    const { toolName, input, toolCallId } = toolCall;
    console.log(`🔧 Executing tool: ${toolName}, input:`, input, `toolCallId: ${toolCallId}`);

    // Use the AI Toolkit to execute the tool
    const toolkit = getAiToolkit(editor);
    const result = toolkit.executeTool({
      toolName,
      input,
      currentChunk: currentChunk.current,
    });

    console.log(`✅ Tool result:`, result);
    currentChunk.current = result.currentChunk;

    // Add tool result to the same assistant message and continue conversation
    setMessages(prev => {
      const updated = prev.map(msg => {
        if (msg.id === assistantMessageId) {
          const newPart: MessagePart = {
            type: "tool_result",
            toolCallId,
            toolName,
            args: input,
            result: result.output as unknown,
          };
          return {
            ...msg,
            parts: [...(msg.parts || []), newPart],
          };
        }
        return msg;
      });

      // Continue the conversation with updated messages
      continueConversation(updated, assistantMessageId).catch(err =>
        console.error("Error continuing conversation:", err)
      );

      return updated as Message[];
    });

    console.log(`📤 Added tool result for ${toolName}:`, result.output);
  };

  // Handle streaming chunks from backend (ai_service.py GPT-5 format)
  const handleStreamChunk = async (chunk: string | { type: string; name?: string; call_id?: string; arguments?: string | Record<string, unknown>; status?: string; error?: string }, messageId: string) => {
    console.log("📥 Stream chunk:", chunk);

    // Handle text content (string chunks from ai_service.py)
    if (typeof chunk === 'string') {
      // Add text to current message
      setMessages(prev => prev.map(msg => {
        if (msg.id === messageId) {
          const textParts = msg.parts?.filter(p => p.type === "text") || [];
          const otherParts = msg.parts?.filter(p => p.type !== "text") || [];

          if (textParts.length > 0) {
            // Update existing text part
            textParts[0].text = (textParts[0].text || "") + chunk;
          } else {
            // Create new text part
            textParts.push({ type: "text", text: chunk });
          }

          return { ...msg, parts: [...textParts, ...otherParts] };
        }
        return msg;
      }));
      return;
    }

    // Handle object chunks (function calls, errors, etc.)
    switch (chunk.type) {
      case "function_call":
        console.log("🔧 Function call:", chunk);
        // Handle GPT-5 function call format from ai_service.py
        if (chunk.name && chunk.call_id && chunk.status === "in_progress") {
          // Cancel current upstream stream to avoid double-processing (like duplicate applyDiff)
          try {
            await streamReaderRef.current?.cancel();
          } catch (e) {
            console.warn("Stream cancel warning:", e);
          } finally {
            streamReaderRef.current = null;
          }
          let parsedArgs: Record<string, unknown> = {};

          // Handle both string and already-parsed arguments
          if (typeof chunk.arguments === 'string') {
            try {
              parsedArgs = JSON.parse(chunk.arguments);
            } catch (e) {
              console.error("Failed to parse function call arguments:", e);
              parsedArgs = {};
            }
          } else if (chunk.arguments) {
            parsedArgs = chunk.arguments;
          }

          // First, record the tool call as a part on the assistant message
          setMessages(prev => prev.map((msg: Message) => {
            if (msg.id === messageId) {
              const newPart: MessagePart = {
                type: "tool_call",
                toolCallId: chunk.call_id,
                toolName: chunk.name,
                args: parsedArgs,
              };
              const updated: Message = {
                ...msg,
                parts: [...(msg.parts || []), newPart],
              };
              return updated;
            }
            return msg;
          }));

          // Then execute the tool and continue
          const toolCall = {
            toolName: chunk.name,
            input: parsedArgs,
            toolCallId: chunk.call_id,
          };
          await handleToolCall(toolCall, messageId);
        }
        break;

      case "error":
        console.error("❌ Stream error:", chunk.error);
        break;

      default:
        console.log("📝 Other chunk type:", chunk.type);
        break;
    }
  };

  const [input, setInput] = useState(
    "Replace the last paragraph with a short story about Tiptap"
  );

  // Build backend-ready messages (similar to Vercel transport)
  const buildBackendMessages = (msgs: Message[]) => {
    const out: Array<Record<string, unknown>> = [];
    for (const m of msgs) {
      if (m.role === "user" || m.role === "system") {
        const text = m.content || (m.parts || [])
          .filter(p => p.type === "text")
          .map(p => p.text || "")
          .join("");
        if (text) out.push({ role: m.role, content: text });
        continue;
      }

      if (m.role === "assistant") {
        const text = m.content || (m.parts || [])
          .filter(p => p.type === "text")
          .map(p => p.text || "")
          .join("");
        if (text) out.push({ role: "assistant", content: text });

        // Emit tool calls
        for (const p of m.parts || []) {
          if (p.type === "tool_call" && p.toolCallId && p.toolName) {
            let argumentsStr = "{}";
            try {
              argumentsStr = JSON.stringify(p.args || {});
            } catch {}
            out.push({
              type: "function_call",
              call_id: p.toolCallId,
              name: p.toolName,
              arguments: argumentsStr,
              id: `fc_${p.toolCallId}`,
            });
          }
        }

        // Emit tool results
        for (const p of m.parts || []) {
          if (p.type === "tool_result" && p.toolCallId) {
            let outputStr = "{}";
            try {
              outputStr = JSON.stringify(p.result ?? {});
            } catch {}
            out.push({
              type: "function_call_output",
              call_id: p.toolCallId,
              output: outputStr,
            });
          }
        }
      }
    }
    return out;
  };

  // Continue conversation after tool execution
  const continueConversation = async (updatedMessages: Message[], assistantMessageId: string) => {
    const response = await fetch("http://localhost:8000/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: buildBackendMessages(updatedMessages) }),
    });

    if (!response.ok) throw new Error(`HTTP error ${response.status}`);

    const reader = response.body?.getReader();
    if (!reader) throw new Error("No reader available");
    streamReaderRef.current = reader;

    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) {
        if (line.startsWith("data: ") && !line.includes("[DONE]")) {
          try {
            const data = JSON.parse(line.slice(6));
            await handleStreamChunk(data, assistantMessageId);
          } catch (e) {
            console.error("Error parsing continued stream chunk:", e);
          }
        }
      }
    }
  };

  if (!editor) return null;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">AI Agent Chatbot (Custom)</h1>

      <div className="mb-6">
        <EditorContent
          editor={editor}
          className="border border-gray-300 rounded-lg p-4 min-h-[200px]"
        />
      </div>

      <div className="mb-6 space-y-4">
        {messages?.map((message) => (
          <div key={message.id} className="bg-gray-100 p-4 rounded-lg">
            <strong className="text-blue-600">{message.role}</strong>
            <br />
            <div className="mt-2 whitespace-pre-wrap">
              {message.parts
                ?.filter((p) => p.type === "text")
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
            sendMessage(input);
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
