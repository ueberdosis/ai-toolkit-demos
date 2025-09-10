"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useRef, useState } from "react";
import { AiToolkit, getAiToolkit } from "@tiptap-pro/ai-toolkit";

// Custom message types for GPT-5 function calling
interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content?: string;
  parts?: MessagePart[];
}

interface MessagePart {
  type: "text" | "function_call" | "function_call_output";
  text?: string;
  call_id?: string;
  name?: string;
  arguments?: string;
  output?: string;
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

  // Custom state management for messages
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Custom function to send messages and handle streaming
  const sendMessage = async (text: string) => {
    if (!text.trim()) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text,
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Send to our backend
      const response = await fetch("http://localhost:8000/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [...messages, userMessage],
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader available");

      let assistantMessage: Message = {
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
    } finally {
      setIsLoading(false);
    }
  };

  // Handle streaming chunks from backend
  const handleStreamChunk = async (chunk: any, messageId: string) => {
    console.log("📥 Stream chunk:", chunk);

    switch (chunk.type) {
      case "text-delta":
        // Add text to current message
        setMessages(prev => prev.map(msg => {
          if (msg.id === messageId) {
            const textParts = msg.parts?.filter(p => p.type === "text") || [];
            const otherParts = msg.parts?.filter(p => p.type !== "text") || [];
            
            if (textParts.length > 0) {
              // Update existing text part
              textParts[0].text = (textParts[0].text || "") + chunk.textDelta;
            } else {
              // Create new text part
              textParts.push({ type: "text", text: chunk.textDelta });
            }
            
            return { ...msg, parts: [...textParts, ...otherParts] };
          }
          return msg;
        }));
        break;

      case "tool-input-available":
        // Store function call and execute tool
        const functionCall: MessagePart = {
          type: "function_call",
          call_id: chunk.toolCallId,
          name: chunk.toolName,
          arguments: JSON.stringify(chunk.input),
        };

        // Add function call to message
        setMessages(prev => prev.map(msg => {
          if (msg.id === messageId) {
            return { ...msg, parts: [...(msg.parts || []), functionCall] };
          }
          return msg;
        }));

        // Execute the tool
        await executeToolCall(chunk.toolCallId, chunk.toolName, chunk.input, messageId);
        break;
    }
  };

  // Execute tool and add result to message
  const executeToolCall = async (toolCallId: string, toolName: string, input: any, messageId: string) => {
    console.log(`🔧 Executing tool: ${toolName}`, input);
    
    const editor = editorRef.current;
    if (!editor) {
      console.error("❌ No editor available");
      return;
    }

    try {
      // Use the AI Toolkit to execute the tool
      const toolkit = getAiToolkit(editor);
      const result = toolkit.executeTool({
        toolName,
        input,
        currentChunk: currentChunk.current,
      });

      console.log(`✅ Tool result:`, result);
      currentChunk.current = result.currentChunk;

      // Add function call output to message
      const functionCallOutput: MessagePart = {
        type: "function_call_output",
        call_id: toolCallId,
        output: JSON.stringify(result.output),
      };

      setMessages(prev => prev.map(msg => {
        if (msg.id === messageId) {
          return { ...msg, parts: [...(msg.parts || []), functionCallOutput] };
        }
        return msg;
      }));

    } catch (error) {
      console.error(`❌ Tool execution failed:`, error);
      
      // Add error as function call output
      const errorOutput: MessagePart = {
        type: "function_call_output",
        call_id: toolCallId,
        output: JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      };

      setMessages(prev => prev.map(msg => {
        if (msg.id === messageId) {
          return { ...msg, parts: [...(msg.parts || []), errorOutput] };
        }
        return msg;
      }));
    }
  };

  const [input, setInput] = useState(
    "Replace the last paragraph with a short story about Tiptap"
  );

  if (!editor) return null;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">AI Agent Chatbot (Custom GPT-5)</h1>
      <p className="text-gray-600 mb-4">
        This version uses custom function calling that handles GPT-5's two-object pattern directly.
      </p>

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
              {/* Display text content */}
              {message.content && <div>{message.content}</div>}
              
              {/* Display text from parts */}
              {message.parts?.filter(p => p.type === "text").map((part, index) => (
                <div key={index}>{part.text}</div>
              ))}
              
              {/* Display function calls for debugging */}
              {message.parts?.filter(p => p.type === "function_call").map((part, index) => (
                <div key={index} className="text-sm text-gray-600 mt-2">
                  🔧 Tool: {part.name} ({part.call_id})
                </div>
              ))}
              
              {/* Display function call outputs for debugging */}
              {message.parts?.filter(p => p.type === "function_call_output").map((part, index) => (
                <div key={index} className="text-sm text-green-600 mt-1">
                  ✅ Result: {part.call_id}
                </div>
              ))}
              
              {/* Show loading if no content yet */}
              {!message.content && (!message.parts || message.parts.length === 0) && "Loading..."}
            </div>
          </div>
        ))}
        
        {/* Show loading indicator */}
        {isLoading && (
          <div className="bg-gray-100 p-4 rounded-lg">
            <strong className="text-blue-600">assistant</strong>
            <br />
            <div className="mt-2 text-gray-500">Thinking...</div>
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (input.trim() && !isLoading) {
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
          disabled={isLoading}
          className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? "Sending..." : "Send"}
        </button>
      </form>
    </div>
  );
}
