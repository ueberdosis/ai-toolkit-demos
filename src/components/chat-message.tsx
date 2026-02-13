"use client";

import { Bot, User } from "lucide-react";

interface ChatMessageProps {
  role: "system" | "user" | "assistant";
  content: string[];
}

export function ChatMessage({ role, content }: ChatMessageProps) {
  const isUser = role === "user";

  return (
    <div
      className={`flex items-start gap-2 ${isUser ? "flex-row-reverse ml-auto" : ""}`}
      style={{ maxWidth: "85%" }}
    >
      {isUser ? (
        <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 flex-shrink-0 flex items-center justify-center">
          <User size={14} />
        </div>
      ) : (
        <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-600 flex-shrink-0 flex items-center justify-center">
          <Bot size={14} />
        </div>
      )}
      <div
        className={`rounded-lg px-3 py-2 text-sm whitespace-pre-wrap break-words ${
          isUser ? "bg-white border border-slate-200" : "bg-slate-50"
        }`}
      >
        {content.length === 1 ? (
          content[0]
        ) : (
          <div className="space-y-2">
            {content.map((block) => (
              <div key={block}>{block}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
