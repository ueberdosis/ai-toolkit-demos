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
import { ChatSidebar } from "../../components/chat-sidebar";
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

  // Fixes issue: https://github.com/vercel/ai/issues/7819
  const schemaAwareness = editor
    ? getAiToolkit(editor).getHtmlSchemaAwareness()
    : "";
  const schemaAwarenessRef = useRef(schemaAwareness);
  schemaAwarenessRef.current = schemaAwareness;

  const { messages, sendMessage, addToolOutput, status } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/schema-awareness",
      body: () => ({ schemaAwareness: schemaAwarenessRef.current }),
    }),
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    async onToolCall({ toolCall }) {
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

  const isLoading = status !== "ready";

  const handleSubmit = (e: SubmitEvent) => {
    e.preventDefault();
    if (input.trim()) {
      sendMessage({ text: input });
      setInput("");
    }
  };

  if (!editor) return null;

  return (
    <div className="flex h-screen">
      <div className="flex-1 overflow-y-auto">
        <EditorContent editor={editor} />
      </div>

      <ChatSidebar
        messages={messages}
        input={input}
        onInputChange={setInput}
        onSubmit={handleSubmit}
        isLoading={isLoading}
      />
    </div>
  );
}
