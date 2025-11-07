"use client";

import { useChat } from "@ai-sdk/react";
import { mergeAttributes, Node } from "@tiptap/core";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { AiToolkit, getAiToolkit } from "@tiptap-pro/ai-toolkit";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
} from "ai";
import { useRef, useState } from "react";
import "./alert-styles.css";

// Custom Alert Node Extension
const CustomAlertExtension = Node.create({
  name: "alert",

  group: "block",

  content: "inline*",

  addAttributes() {
    return {
      type: {
        default: "info",
        parseHTML: (element) => element.getAttribute("data-type"),
        renderHTML: (attributes) => {
          return {
            "data-type": attributes.type,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "div[data-alert]",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-alert": "",
      }),
      0,
    ];
  },

  addHtmlSchemaAwareness() {
    return {
      tag: "div",
      name: "Alert Box",
      description: `A highlighted box used to display important information, warnings, or tips to the user.
It can have inline content inside like text and formatting tags.
It can NOT contain a paragraph tag or any other block element inside.`,
      attributes: [
        {
          attr: "data-alert",
          value: "",
          description: "Indicates that this is an alert box",
        },
        {
          attr: "data-type",
          description:
            "The type of alert. Can be one of these 4 values: info, warning, error, or success",
        },
      ],
    };
  },
});

export default function Page() {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit, AiToolkit, CustomAlertExtension],
    content: `<h1>User Authentication API</h1>
      <p>This API endpoint handles user authentication and returns a JWT token for authorized access to protected resources.</p>

      <h2>Endpoint</h2>
      <p><code>POST /api/auth/login</code></p>

      <h2>Request Body</h2>
      <p>The request must include the following parameters:</p>
      <ul>
        <li><strong>email</strong> (string, required): User's email address</li>
        <li><strong>password</strong> (string, required): User's password</li>
        <li><strong>remember_me</strong> (boolean, optional): Keep user logged in for extended period</li>
      </ul>

      <h2>Response</h2>
      <p>On successful authentication, the API returns a JSON object with the following structure:</p>
      <pre><code>{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 123,
    "email": "user@example.com",
    "name": "John Doe"
  },
  "expires_in": 3600
}</code></pre>

      <h2>Error Handling</h2>
      <p>The API may return the following error responses:</p>
      <ul>
        <li><strong>400 Bad Request</strong>: Missing required parameters</li>
        <li><strong>401 Unauthorized</strong>: Invalid credentials</li>
        <li><strong>429 Too Many Requests</strong>: Rate limit exceeded</li>
        <li><strong>500 Internal Server Error</strong>: Server-side error</li>
      </ul>

      <h2>Rate Limiting</h2>
      <p>This endpoint is rate-limited to 5 requests per minute per IP address to prevent brute force attacks.</p>

      <h2>Security Considerations</h2>
      <p>Always use HTTPS when calling this endpoint. Store the returned JWT token securely and include it in the Authorization header for subsequent API calls.</p>`,
  });

  // Fixes issue: https://github.com/vercel/ai/issues/8148
  const editorRef = useRef(editor);
  editorRef.current = editor;

  // Fixes issue: https://github.com/vercel/ai/issues/7819
  const schemaAwareness = editor
    ? getAiToolkit(editor).getHtmlSchemaAwareness()
    : "";
  const schemaAwarenessRef = useRef(schemaAwareness);
  schemaAwarenessRef.current = schemaAwareness;

  const { messages, sendMessage, addToolOutput } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/schema-awareness",
      body: () => ({ schemaAwareness: schemaAwarenessRef.current }),
    }),
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    async onToolCall({ toolCall }) {
      const editor = editorRef.current;
      if (!editor) return;

      const { toolName, input, toolCallId } = toolCall;

      // Use the AI Toolkit to execute the tool
      const toolkit = getAiToolkit(editor);
      const result = toolkit.executeTool({
        toolName,
        input,
      });

      addToolOutput({ tool: toolName, toolCallId, output: result.output });
    },
  });

  const [input, setInput] = useState(
    `Improve this API documentation by adding appropriate alert boxes to highlight important information:

1. Add an INFO alert at the beginning explaining what this API does and its importance
2. Add a WARNING alert in the Error Handling section about security implications of failed login attempts
3. Add an ERROR alert in the Rate Limiting section explaining what happens when limits are exceeded
4. Add a SUCCESS alert in the Security Considerations section with a tip about token storage best practices

Make sure each alert contains relevant, helpful information that enhances the documentation's clarity and usability.`,
  );

  if (!editor) return null;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">
        AI chatbot with schema awareness
      </h1>

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
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 border border-gray-300 rounded-lg px-4 py-2 min-h-[200px]"
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
