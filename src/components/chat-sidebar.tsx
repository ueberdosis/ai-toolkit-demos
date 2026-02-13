"use client";

import { Bot, Loader2, MessageSquare, Send, X } from "lucide-react";
import {
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { ChatMessage } from "./chat-message";

interface Message {
  id: string;
  role: "system" | "user" | "assistant";
  parts: Array<{ type: string; text?: string }>;
}

interface ChatSidebarProps {
  messages: Message[];
  input: string;
  onInputChange: (value: string) => void;
  onSubmit: (e: SubmitEvent) => void;
  isLoading: boolean;
  placeholder?: string;
  children?: ReactNode;
  disabled?: boolean;
  embedded?: boolean;
}

function extractContent(parts: Array<{ type: string; text?: string }>): string {
  return parts
    .filter((p) => p.type === "text" && p.text)
    .map((p) => p.text)
    .join("\n");
}

function extractContentBlocks(
  parts: Array<{ type: string; text?: string }>,
): string[] {
  return parts
    .filter((p) => p.type === "text" && p.text)
    .map((p) => p.text as string);
}

function TypingIndicator() {
  return (
    <div className="flex items-start gap-2">
      <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-600 flex-shrink-0 flex items-center justify-center">
        <Bot size={14} />
      </div>
      <div className="bg-slate-50 rounded-lg px-3 py-2">
        <div className="flex items-center gap-1">
          <span
            className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce"
            style={{ animationDelay: "0ms", animationDuration: "0.6s" }}
          />
          <span
            className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce"
            style={{ animationDelay: "150ms", animationDuration: "0.6s" }}
          />
          <span
            className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce"
            style={{ animationDelay: "300ms", animationDuration: "0.6s" }}
          />
        </div>
      </div>
    </div>
  );
}

function MessagesArea({
  messages,
  isLoading,
  children,
}: {
  messages: Message[];
  isLoading: boolean;
  children?: ReactNode;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);

  const messageCount = messages.length;
  const lastContent =
    messages.length > 0
      ? extractContent(messages[messages.length - 1].parts)
      : "";

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messageCount, isLoading, lastContent]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3">
      {messages.length === 0 && !isLoading ? (
        <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
          <MessageSquare size={24} />
          <p className="text-sm">Send a message to start</p>
        </div>
      ) : (
        <>
          {messages.map((message) => {
            const blocks = extractContentBlocks(message.parts);
            if (blocks.length === 0) return null;
            return (
              <ChatMessage
                key={message.id}
                role={message.role}
                content={blocks}
              />
            );
          })}
          {isLoading &&
            (() => {
              const last = messages[messages.length - 1];
              return (
                !last || last.role === "user" || !extractContent(last.parts)
              );
            })() && <TypingIndicator />}
        </>
      )}
      <div ref={bottomRef} />
      {children}
    </div>
  );
}

function InputArea({
  input,
  onInputChange,
  onSubmit,
  isLoading,
  placeholder,
  disabled,
}: {
  input: string;
  onInputChange: (value: string) => void;
  onSubmit: (e: SubmitEvent) => void;
  isLoading: boolean;
  placeholder?: string;
  disabled?: boolean;
}) {
  const isDisabled = disabled || isLoading;

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!isDisabled) {
        onSubmit(e as unknown as SubmitEvent);
      }
    }
  }

  return (
    <div className="border-t border-slate-200 p-4">
      <form onSubmit={(e) => onSubmit(e.nativeEvent as SubmitEvent)}>
        <textarea
          className="w-full resize-none border border-[var(--gray-3)] rounded-lg px-3 py-2 text-sm focus:border-[var(--purple)] focus:outline-none placeholder:text-[var(--gray-4)]"
          rows={3}
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder ?? "Type a message..."}
          disabled={isDisabled}
        />
        <button
          type="submit"
          disabled={isDisabled}
          className="w-full mt-2 flex items-center justify-center gap-2 rounded-lg border-none px-4 py-2 text-sm font-medium bg-[var(--gray-2)] text-[var(--black)] hover:bg-[var(--gray-3)] hover:text-[var(--black-contrast)] disabled:bg-[var(--gray-1)] disabled:text-[var(--gray-4)] cursor-pointer disabled:cursor-default"
          style={{
            transition: "all 0.2s cubic-bezier(0.65, 0.05, 0.36, 1)",
          }}
        >
          {isLoading ? (
            <>
              <Loader2 className="animate-spin" size={16} />
              Processing...
            </>
          ) : (
            <>
              <Send size={16} />
              Send
            </>
          )}
        </button>
      </form>
    </div>
  );
}

export function ChatSidebar({
  messages,
  input,
  onInputChange,
  onSubmit,
  isLoading,
  placeholder,
  children,
  disabled,
  embedded,
}: ChatSidebarProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (embedded) {
    return (
      <div className="flex flex-col h-full">
        <MessagesArea messages={messages} isLoading={isLoading} />
        {children}
        <InputArea
          input={input}
          onInputChange={onInputChange}
          onSubmit={onSubmit}
          isLoading={isLoading}
          placeholder={placeholder}
          disabled={disabled}
        />
      </div>
    );
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden sm:flex w-80 lg:w-96 flex-shrink-0 border-l border-slate-200 h-screen flex-col">
        <MessagesArea messages={messages} isLoading={isLoading} />
        {children}
        <InputArea
          input={input}
          onInputChange={onInputChange}
          onSubmit={onSubmit}
          isLoading={isLoading}
          placeholder={placeholder}
          disabled={disabled}
        />
      </aside>

      {/* Mobile floating button */}
      <button
        type="button"
        className="sm:hidden fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full px-4 py-2.5 shadow-lg bg-[var(--black)] text-white text-sm font-medium"
        onClick={() => setIsModalOpen(true)}
      >
        {isLoading ? (
          <>
            <Loader2 className="animate-spin" size={16} />
            AI thinking...
          </>
        ) : (
          <>
            <MessageSquare size={16} />
            Chat
            {messages.length > 0 && (
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-white text-black text-xs font-bold">
                {messages.length}
              </span>
            )}
          </>
        )}
      </button>

      {/* Mobile modal */}
      {isModalOpen && (
        <div className="sm:hidden fixed inset-0 z-50 flex flex-col bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <span className="font-medium text-sm">AI Chat</span>
            <button
              type="button"
              className="rounded-full p-1 hover:bg-slate-100"
              onClick={() => setIsModalOpen(false)}
            >
              <X size={20} />
            </button>
          </div>
          <MessagesArea messages={messages} isLoading={isLoading} />
          {children}
          <InputArea
            input={input}
            onInputChange={onInputChange}
            onSubmit={onSubmit}
            isLoading={isLoading}
            placeholder={placeholder}
            disabled={disabled}
          />
        </div>
      )}
    </>
  );
}
